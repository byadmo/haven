import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function amortize(balance, apr, payment, extra = 0) {
  const r = apr / 100 / 12;
  const pay = payment + extra;
  let bal = balance;
  let months = 0;
  let interest = 0;
  if (r > 0 && pay <= balance * r) return { months: null, interest: null };
  let safety = 600;
  while (bal > 0.01 && safety-- > 0) {
    const i = bal * r;
    interest += i;
    bal = bal + i - pay;
    if (bal < 0) { interest += bal; bal = 0; }
    months++;
  }
  return { months, interest: Number(interest.toFixed(2)) };
}

function waterfall(debts, extra = 0) {
  const alive = debts.map((d) => ({ name: d.name, balance: d.current_balance || 0, apr: d.interest_rate || 0, min: d.minimum_payment || 0 }));
  let months = 0;
  let totalInterest = 0;
  let safety = 600;
  while (alive.some((d) => d.balance > 0.01) && safety-- > 0) {
    for (const d of alive) {
      if (d.balance <= 0.01) continue;
      const r = d.apr / 100 / 12;
      const i = d.balance * r;
      totalInterest += i;
      d.balance = Math.max(0, d.balance + i - d.min);
    }
    const target = alive.filter((d) => d.balance > 0.01).sort((a, b) => b.apr - a.apr)[0];
    if (target && extra > 0) target.balance = Math.max(0, target.balance - extra);
    months++;
  }
  return { months, totalInterest: Number(totalInterest.toFixed(2)) };
}

function monthsAhead(months) {
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() + Math.ceil(months));
  return d.toISOString().slice(0, 10);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const extra = Number(body.extra_payment) || 0;

    const debts = (await base44.entities.Debt.list()).filter((d) => d.status !== 'paid_off' && (d.current_balance || 0) > 0);
    const perDebt = debts.map((d) => {
      const bal = d.current_balance || 0;
      const apr = d.interest_rate || 0;
      const min = d.minimum_payment || 0;
      const base = amortize(bal, apr, min, 0);
      const accel = amortize(bal, apr, min, extra);
      let status = 'on_track';
      if (d.target_payoff_date && base.months) {
        const projected = monthsAhead(base.months);
        status = projected <= d.target_payoff_date ? 'ahead' : 'behind';
      }
      return {
        id: d.id,
        name: d.name,
        balance: Number(bal.toFixed(2)),
        apr,
        minimum_payment: min,
        months_to_payoff: base.months,
        payoff_date: monthsAhead(base.months),
        total_interest: base.interest,
        accelerated_payoff_date: monthsAhead(accel.months),
        accelerated_interest: accel.interest,
        target_payoff_date: d.target_payoff_date || null,
        status,
      };
    });

    const combined = waterfall(debts, extra);
    const combinedBase = waterfall(debts, 0);
    const interestSaved = Number((combinedBase.totalInterest - combined.totalInterest).toFixed(2));
    return Response.json({
      per_debt: perDebt,
      debt_free_date: monthsAhead(combined.months),
      months_to_debt_free: combined.months,
      total_interest: combined.totalInterest,
      base_interest: combinedBase.totalInterest,
      interest_saved_by_extra: interestSaved,
      extra_payment: extra,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}