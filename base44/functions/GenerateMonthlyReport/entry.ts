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

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif`;

function metricCard(label, value, color) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr><td style="padding:16px 20px;background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);border-left:3px solid ${color};border-radius:10px;">
    <span style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.2px;font-family:${SANS};">${label}</span><br>
    <span style="font-size:22px;color:${color};font-weight:700;font-family:${SANS};">${fmtMoney(value)}</span>
  </td></tr></table>`;
}

function sectionHeading(title, color) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr><td style="padding:0;font-family:${SANS};">
      <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%;margin-right:10px;vertical-align:middle;font-size:0;">&nbsp;</span>
      <span style="font-size:17px;color:#fff;font-weight:600;vertical-align:middle;">${title}</span>
    </td></tr></table>`;
}

function buildPctBar(pct, color) {
  const p = Math.max(0, Math.min(100, pct));
  const w = Math.max(p, 2);
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.06);border-radius:6px;height:6px;"><tr>
    <td width="${w}%" style="background:${color};border-radius:6px;height:6px;font-size:0;line-height:0;">&nbsp;</td>
    <td width="${100 - w}%" style="font-size:0;line-height:0;">&nbsp;</td>
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
          return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="padding:0;font-size:14px;color:rgba(255,255,255,0.9);font-weight:500;font-family:${SANS};">${cat}</td>
              <td align="right" style="padding:0;font-size:14px;color:#f43f5e;font-weight:600;font-family:${SANS};">${fmtMoney(amt)}</td>
            </tr>
            <tr><td colspan="2" style="padding:6px 0 0 0;">${buildPctBar(pct, '#f43f5e')}</td></tr>
          </table>`;
        }).join('');
      } else {
        catsHtml = '<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);font-family:${SANS};">No expenses logged this period.</p>';
      }

      let debtsHtml = '';
      if (userDebts.length) {
        debtsHtml = '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">' +
          userDebts.map((d) => {
            const bal = d.current_balance || 0;
            const orig = d.original_balance || bal;
            const pct = orig > 0 ? Math.max(0, Math.min(100, Math.round((1 - bal / orig) * 100))) : 0;
            const paid = paidByDebt[d.id] || 0;
            const meta = `${pct}% paid` + (d.interest_rate ? ` &middot; ${d.interest_rate}% rate` : '');
            const paidLine = paid > 0
              ? `<td align="right" style="padding:6px 0 0 0;font-size:12px;color:#10b981;font-weight:600;font-family:${SANS};">+${fmtMoney(paid)} this period</td>`
              : '<td></td>';
            return `<tr><td style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.06);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0;font-size:14px;color:#fff;font-weight:600;font-family:${SANS};">${d.name}</td>
                  <td align="right" style="padding:0;font-size:14px;color:rgba(255,255,255,0.7);font-family:${SANS};">${fmtMoney(bal)}</td>
                </tr>
                <tr><td colspan="2" style="padding:8px 0 0 0;">${buildPctBar(pct, '#10b981')}</td></tr>
                <tr>
                  <td style="padding:6px 0 0 0;font-size:12px;color:rgba(255,255,255,0.4);font-family:${SANS};">${meta}</td>
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
            <td style="padding:10px 0;font-size:14px;color:rgba(255,255,255,0.7);border-bottom:1px solid rgba(255,255,255,0.06);font-family:${SANS};">${a.name}</td>
            <td align="right" style="padding:10px 0;font-size:14px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);font-family:${SANS};">${fmtMoney(a.balance || 0)}</td>
          </tr>`).join('') + '</table>';
      } else {
        accountsHtml = '<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.4);font-family:${SANS};">No accounts configured.</p>';
      }

      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:${SANS};-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;"><tr><td style="padding:20px 14px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;">

<tr><td style="padding:28px 24px 20px 24px;border-bottom:3px solid #10b981;">
  <p style="margin:0 0 6px 0;font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:2.5px;text-transform:uppercase;">DebtFlow</p>
  <p style="margin:0;font-size:24px;color:#fff;font-weight:700;letter-spacing:-0.5px;">Financial Summary</p>
  <p style="margin:6px 0 0 0;font-size:14px;color:rgba(255,255,255,0.5);">${monthName}</p>
</td></tr>

<tr><td style="padding:20px 18px 0 18px;">
  ${metricCard('Total Income', income, '#10b981')}
  ${metricCard('Total Expenses', expenses, '#f43f5e')}
  ${metricCard('Net Savings', savings, savingsColor)}
  ${metricCard('Net Worth', netWorth, '#6366f1')}
</td></tr>

<tr><td style="padding:24px 18px 0 18px;">
  ${sectionHeading('Spending Breakdown', '#f43f5e')}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;"><tr><td style="padding:16px 18px;">${catsHtml}</td></tr></table>
</td></tr>

<tr><td style="padding:24px 18px 0 18px;">
  ${sectionHeading('Debt Repayment', '#f59e0b')}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;"><tr><td style="padding:16px 18px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
      <tr>
        <td style="padding:0;font-size:13px;color:rgba(255,255,255,0.6);">Total Paid</td>
        <td align="right" style="padding:0;font-size:18px;color:#10b981;font-weight:700;">${fmtMoney(totalPaid)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0 0 0;font-size:13px;color:rgba(255,255,255,0.6);">Current Total Debt</td>
        <td align="right" style="padding:8px 0 0 0;font-size:18px;color:#f59e0b;font-weight:700;">${fmtMoney(totalDebt)}</td>
      </tr>
    </table>
    ${debtsHtml}
  </td></tr></table>
</td></tr>

<tr><td style="padding:24px 18px 0 18px;">
  ${sectionHeading('Account Balances', '#6366f1')}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.08);border-radius:10px;"><tr><td style="padding:16px 18px;">${accountsHtml}</td></tr></table>
</td></tr>

<tr><td style="padding:28px 18px 24px 18px;text-align:center;">
  <p style="margin:0 0 6px 0;font-size:14px;color:rgba(255,255,255,0.5);">Log in to DebtFlow to review your full dashboard.</p>
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.2);">DebtFlow &middot; ${dateStr}</p>
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