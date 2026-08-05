import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function simulate(debts, extra, sortBy) {
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
    const pool = alive.filter((d) => d.balance > 0.01);
    pool.sort((a, b) => sortBy(a, b));
    const target = pool[0];
    if (target && extra > 0) target.balance = Math.max(0, target.balance - extra);
    months++;
  }
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return { months_to_payoff: months, total_interest: Number(totalInterest.toFixed(2)), debt_free_date: d.toISOString().slice(0, 10) };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const extra = Number(body.extra_payment) || 0;

    const profile = await base44.entities.UserFinancialProfile.list();
    const risk = (profile[0] && profile[0].risk_tolerance) || 'moderate';

    const debts = (await base44.entities.Debt.list()).filter((d) => d.status !== 'paid_off' && (d.current_balance || 0) > 0);

    const snowball = simulate(debts, extra, (a, b) => a.balance - b.balance);
    const avalanche = simulate(debts, extra, (a, b) => b.apr - a.apr);
    const interestSaved = Number((snowball.total_interest - avalanche.total_interest).toFixed(2));
    const timeSaved = snowball.months_to_payoff - avalanche.months_to_payoff;

    let recommendation;
    if (risk === 'aggressive') recommendation = 'avalanche';
    else if (risk === 'conservative') recommendation = 'snowball';
    else recommendation = interestSaved > 0 ? 'avalanche' : 'snowball';

    return Response.json({
      snowball,
      avalanche,
      extra_payment: extra,
      interest_saved_by_avalanche: interestSaved,
      time_saved_by_snowball: timeSaved,
      recommendation,
      risk_tolerance: risk,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}