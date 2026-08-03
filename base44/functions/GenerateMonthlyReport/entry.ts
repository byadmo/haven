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

      const lines = [
        `Hi ${user.full_name || 'there'},`,
        '',
        `Here's your financial summary for ${monthName}:`,
        '',
        '========================================',
        '  OVERVIEW',
        '========================================',
        `  Total Income:     ${fmtMoney(income)}`,
        `  Total Expenses:   ${fmtMoney(expenses)}`,
        `  Net Savings:      ${fmtMoney(savings)}`,
        `  Transactions:     ${txnCount}`,
        `  Net Worth:        ${fmtMoney(netWorth)}`,
        '',
        '========================================',
        '  TOP SPENDING CATEGORIES',
        '========================================',
      ];

      if (topCats.length) {
        topCats.forEach(([cat, amt]) => { lines.push(`  ${cat}: ${fmtMoney(amt)}`); });
      } else {
        lines.push('  No expenses logged this period.');
      }

      lines.push('', '========================================', '  DEBT REPAYMENT PROGRESS', '========================================');
      lines.push(`  Total Paid This Period: ${fmtMoney(totalPaid)}`);
      lines.push(`  Current Total Debt:     ${fmtMoney(totalDebt)}`);

      if (userDebts.length) {
        lines.push('');
        const paidByDebt = {};
        monthPayments.forEach((p) => { paidByDebt[p.debt_id] = (paidByDebt[p.debt_id] || 0) + (p.amount || 0); });
        userDebts.forEach((d) => {
          const bal = d.current_balance || 0;
          const orig = d.original_balance || bal;
          const pct = orig > 0 ? Math.max(0, Math.min(100, Math.round((1 - bal / orig) * 100))) : 0;
          const interest = d.interest_rate ? ` @ ${d.interest_rate}%` : '';
          lines.push(`  ${d.name}: ${fmtMoney(bal)} (${pct}% paid${interest})`);
          if (paidByDebt[d.id] > 0) {
            lines.push(`    -> paid this period: ${fmtMoney(paidByDebt[d.id])}`);
          }
        });
      }

      lines.push('', '========================================', '  ACCOUNT BALANCES', '========================================');
      if (userAccounts.length) {
        userAccounts.forEach((a) => { lines.push(`  ${a.name}: ${fmtMoney(a.balance || 0)}`); });
      } else {
        lines.push('  No accounts configured.');
      }

      lines.push('', 'Log in to DebtFlow to review your full dashboard.', '', '— DebtFlow');

      const subject = `Your ${monthName} Financial Summary`;
      const emailBody = lines.join('\n');

      try {
        const rawMessage = [
          `To: ${user.email}`,
          `Subject: ${subject}`,
          'Content-Type: text/plain; charset=UTF-8',
          '',
          emailBody,
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