import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function dayKey(d) { return d.toISOString().slice(0, 10); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const startKey = dayKey(startMonth);
    const endKey = dayKey(endMonth);

    const accounts = await base44.entities.Account.list();
    const startBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);

    const txs = await base44.entities.Transaction.list();
    const debts = await base44.entities.Debt.list();

    const map = {};
    function ensure(key) { if (!map[key]) map[key] = { date: key, income: 0, expenses: 0 }; return map[key]; }

    for (const t of txs) {
      if (!t.date || t.is_scheduled === false) {
        // include both scheduled and actual; only scheduled from future count once, but keep simple
      }
      if (!t.date) continue;
      if (t.date < startKey || t.date > endKey) continue;
      const row = ensure(t.date);
      if (t.type === 'income') row.income += Math.abs(t.amount || 0);
      else row.expenses += Math.abs(t.amount || 0);
    }

    // upcoming minimum debt payments on due_date
    for (const d of debts) {
      if (d.status === 'paid_off' || !d.due_date || !d.minimum_payment) continue;
      if (d.due_date < startKey || d.due_date > endKey) continue;
      const row = ensure(d.due_date);
      row.expenses += d.minimum_payment;
    }

    const days = Object.keys(map).sort();
    let running = startBalance;
    const result = [];
    for (const key of days) {
      const row = map[key];
      running += row.income - row.expenses;
      result.push({
        date: key,
        income: Number(row.income.toFixed(2)),
        expenses: Number(row.expenses.toFixed(2)),
        running_balance: Number(running.toFixed(2)),
        is_crunch_day: running < 0,
      });
    }
    return Response.json({
      starting_balance: Number(startBalance.toFixed(2)),
      days: result,
      crunch_days: result.filter((d) => d.is_crunch_day),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}