import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const fmtMoney = (n) => `$${Number(n || 0).toFixed(2)}`;

function getReportRange(schedule, bodyMonth) {
  if (bodyMonth) {
    const [y, m] = bodyMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const name = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { start, end, name };
  }
  if (schedule === 'weekly') {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const name = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' (month-to-date)';
    return { start, end: now, name };
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const name = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, name };
}

function buildOverviewCard(label, value, color) {
  return `<td width="50%" style="padding:0 4px 8px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:10px;"><tr><td style="padding:16px;">
      <p style="margin:0 0 4px 0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">${label}</p>
      <p style="margin:0;font-size:18px;color:${color};font-weight:600;">${fmtMoney(value)}</p>
    </td></tr></table></td>`;
}

function buildPctBar(pct, color) {
  const p = Math.max(0, Math.min(100, pct));
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.06);border-radius:4px;height:4px;"><tr>
    <td width="${p}%" style="background:${color};border-radius:4px;height:4px;font-size:0;line-height:0;">&nbsp;</td>
    <td width="${100 - p}%" style="font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const userId = body.user_id || null;
    const schedule = body.schedule || 'monthly';
    const { start: monthStart, end: monthEnd, name: monthName } = getReportRange(schedule, body.month);

    let gmailToken = null;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      gmailToken = conn.accessToken;
    } catch (e) {
      return Response.json({ error: 'Gmail connector not connected. Authorize Gmail in the builder chat.' }, { status: 500 });
    }

    const [users, allTxns, allPayments, allDebts, allAccounts] = await Promise.all([
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Transaction.list('-date', 10000),
      base44.asServiceRole.entities.DebtPayment.list('-date', 10000),
      base44.asServiceRole.entities.Debt.list('-created_date'),
      base44.asServiceRole.entities.Account.list('-created_date'),
    ]);

    let targetUsers;
    if (userId) {
      targetUsers = users.filter((u) => u.id === userId);
    } else {
      const freq = schedule === 'weekly' ? 'weekly' : 'monthly';
      targetUsers = users.filter((u) =>
        u.report_enabled !== false &&
        (u.report_frequency || 'monthly') === freq
      );
    }

    let sent = 0;
    const results = [];

    for (const user of targetUsers) {
      if (!user.email) continue;

      const userTxns = allTxns.filter((t) => t.created_by_id === user.id);
      const userPayments = allPayments.filter((p) => p.created_by_id === user.id);
      const userDebts = allDebts.filter((d) => d.created_by_id === user.id);
      const userAccounts = allAccounts.filter((a) => a.created_by_id === user.id);

      let income = 0, expenses = 0;
      const catTotals = {};
      let txnCount = 0;
      userTxns.forEach((t) => {
        try {
          const d = new Date(t.date + 'T00:00:00');
          if (d < monthStart || d > monthEnd) return;
        } catch { return; }
        txnCount++;
        if (t.type === 'income') income += t.amount || 0;
        else {
          expenses += t.amount || 0;
          const cat = t.category || 'Other';
          catTotals[cat] = (catTotals[cat] || 0) + (t.amount || 0);
        }
      });

      const monthPayments = userPayments.filter((p) => {
        try {
          const d = new Date(p.date + 'T00:00:00');
          return d >= monthStart && d <= monthEnd;
        } catch { return false; }
      });
      const totalPaid = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

      const savings = income - expenses;
      const totalDebt = userDebts.reduce((s, d) => s + (d.current_balance || 0), 0);
      const totalCash = userAccounts.reduce((s, a) => s + (a.balance || 0), 0);
      const netWorth = totalCash - totalDebt;

      const topCats = Object.entries(catTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const paidByDebt = {};
      monthPayments.forEach((p) => { paidByDebt[p.debt_id] = (paidByDebt[p.debt_id] || 0) + (p.amount || 0); });

      // --- HTML email sections ---

      const savingsColor = savings >= 0 ? '#10b981' : '#f43f5e';

      let catsHtml;
      if (topCats.length) {
        catsHtml = topCats.map(([cat, amt]) => {
          const pct = expenses > 0 ? Math.round((amt / expenses) * 100) : 0;
          return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
            <tr>
              <td style="padding:0;font-size:13px;color:rgba(255,255,255,0.8);">${cat}</td>
              <td align="right" style="padding:0;font-size:13px;color:#f43f5e;font-weight:500;">${fmtMoney(amt)}</td>
            </tr>
            <tr><td colspan="2" style="padding:4px 0 0 0;">${buildPctBar(pct, '#f43f5e')}</td></tr>
          </table>`;
        }).join('');
      } else {
        catsHtml = '<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">No expenses logged this period.</p>';
      }

      let debtsHtml = '';
      if (userDebts.length) {
        debtsHtml = '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">' +
          userDebts.map((d) => {
            const bal = d.current_balance || 0;
            const orig = d.original_balance || bal;
            const pct = orig > 0 ? Math.max(0, Math.min(100, Math.round((1 - bal / orig) * 100))) : 0;
            const paid = paidByDebt[d.id] || 0;
            const meta = `${pct}% paid` + (d.interest_rate ? ` &middot; ${d.interest_rate}% rate` : '');
            const paidLine = paid > 0
              ? `<td align="right" style="padding:4px 0 0 0;font-size:11px;color:#10b981;">+${fmtMoney(paid)} this period</td>`
              : '<td></td>';
            return `<tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.08);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0;font-size:13px;color:#fff;font-weight:500;">${d.name}</td>
                  <td align="right" style="padding:0;font-size:13px;color:rgba(255,255,255,0.6);">${fmtMoney(bal)}</td>
                </tr>
                <tr><td colspan="2" style="padding:6px 0 0 0;">${buildPctBar(pct, '#10b981')}</td></tr>
                <tr>
                  <td style="padding:4px 0 0 0;font-size:11px;color:rgba(255,255,255,0.4);">${meta}</td>
                  ${paidLine}
                </tr>
              </table>
            </td></tr>`;
          }).join('') + '</table>';
      }

      let accountsHtml;
      if (userAccounts.length) {
        accountsHtml = '<table width="100%" cellpadding="0" cellspacing="0">' +
          userAccounts.map((a) => `<tr>
            <td style="padding:6px 0;font-size:13px;color:rgba(255,255,255,0.7);border-bottom:1px solid rgba(255,255,255,0.06);">${a.name}</td>
            <td align="right" style="padding:6px 0;font-size:13px;color:#fff;font-weight:500;border-bottom:1px solid rgba(255,255,255,0.06);">${fmtMoney(a.balance || 0)}</td>
          </tr>`).join('') + '</table>';
      } else {
        accountsHtml = '<p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">No accounts configured.</p>';
      }

      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#000;font-family:'SF Mono','Menlo','Monaco','Consolas',monospace;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;"><tr><td style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;">

<tr><td style="padding:0 0 24px 0;">
  <p style="margin:0 0 4px 0;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;">DebtFlow</p>
  <p style="margin:0;font-size:22px;color:#fff;font-weight:600;">Financial Summary</p>
  <p style="margin:4px 0 0 0;font-size:13px;color:rgba(255,255,255,0.5);">${monthName}</p>
</td></tr>

<tr><td style="padding:0 0 12px 0;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      ${buildOverviewCard('Income', income, '#10b981')}
      <td width="50%" style="padding:0 0 8px 4px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:10px;"><tr><td style="padding:16px;">
          <p style="margin:0 0 4px 0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Expenses</p>
          <p style="margin:0;font-size:18px;color:#f43f5e;font-weight:600;">${fmtMoney(expenses)}</p>
        </td></tr></table></td>
    </tr>
    <tr>
      <td width="50%" style="padding:0 4px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:10px;"><tr><td style="padding:16px;">
          <p style="margin:0 0 4px 0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Net Savings</p>
          <p style="margin:0;font-size:18px;color:${savingsColor};font-weight:600;">${fmtMoney(savings)}</p>
        </td></tr></table></td>
      <td width="50%" style="padding:0 0 0 4px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:10px;"><tr><td style="padding:16px;">
          <p style="margin:0 0 4px 0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;">Net Worth</p>
          <p style="margin:0;font-size:18px;color:#fff;font-weight:600;">${fmtMoney(netWorth)}</p>
        </td></tr></table></td>
    </tr>
  </table>
</td></tr>

<tr><td style="padding:16px 20px;background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:10px;">
  <p style="margin:0 0 12px 0;font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;">Top Spending Categories</p>
  ${catsHtml}
</td></tr>

<tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>

<tr><td style="padding:16px 20px;background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:10px;">
  <p style="margin:0 0 12px 0;font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;">Debt Repayment Progress</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
      <td style="padding:0;font-size:13px;color:rgba(255,255,255,0.7);">Total Paid This Period</td>
      <td align="right" style="padding:0;font-size:15px;color:#10b981;font-weight:600;">${fmtMoney(totalPaid)}</td>
    </tr>
    <tr>
      <td style="padding:6px 0 0 0;font-size:13px;color:rgba(255,255,255,0.7);">Current Total Debt</td>
      <td align="right" style="padding:6px 0 0 0;font-size:15px;color:#f59e0b;font-weight:600;">${fmtMoney(totalDebt)}</td>
    </tr>
  </table>
  ${debtsHtml}
</td></tr>

<tr><td style="height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>

<tr><td style="padding:16px 20px;background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:10px;">
  <p style="margin:0 0 12px 0;font-size:11px;color:rgba(255,255,255,0.5);letter-spacing:1px;text-transform:uppercase;">Account Balances</p>
  ${accountsHtml}
</td></tr>

<tr><td style="padding:32px 0 0 0;text-align:center;">
  <p style="margin:0 0 8px 0;font-size:13px;color:rgba(255,255,255,0.5);">Log in to DebtFlow to review your full dashboard.</p>
  <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);">DebtFlow &middot; ${dateStr}</p>
</td></tr>

</table></td></tr></table>
</body></html>`;

      const subject = `Your ${monthName} Financial Summary`;

      try {
        const rawMessage = [
          `To: ${user.email}`,
          `Subject: ${subject}`,
          'Content-Type: text/html; charset=UTF-8',
          '',
          htmlBody,
        ].join('\r\n');
        const bytes = new TextEncoder().encode(rawMessage);
        let binary = '';
        for (const b of bytes) binary += String.fromCharCode(b);
        const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gmailToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encoded }),
        });
        if (gmailRes.ok) {
          sent++;
          results.push({ email: user.email, status: 'sent' });
        } else {
          results.push({ email: user.email, status: 'failed' });
        }
      } catch (e) {
        results.push({ email: user.email, status: 'error' });
      }
    }

    return Response.json({ sent, month: monthName, targets: targetUsers.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}