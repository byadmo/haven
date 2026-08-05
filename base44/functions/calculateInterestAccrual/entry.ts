import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const debts = await base44.entities.Debt.list();
    const rows = debts
      .filter((d) => d.status !== 'paid_off' && (d.current_balance || 0) > 0)
      .map((d) => {
        const bal = d.current_balance || 0;
        const apr = d.interest_rate || 0;
        const daily = bal * apr / 100 / 365;
        let monthly = daily * 30;
        if (String(d.interest_type || '').toLowerCase().startsWith('compound') && apr > 0) {
          const r = apr / 100 / 12;
          monthly = bal * Math.pow(1 + r, 1) - bal;
        }
        return {
          id: d.id,
          name: d.name,
          balance: Number(bal.toFixed(2)),
          apr,
          interest_type: d.interest_type || 'APR',
          daily_interest: Number(daily.toFixed(2)),
          monthly_projection: Number(monthly.toFixed(2)),
        };
      })
      .sort((a, b) => b.daily_interest - a.daily_interest);

    const total_daily = rows.reduce((s, r) => s + r.daily_interest, 0);
    const total_monthly = rows.reduce((s, r) => s + r.monthly_projection, 0);
    return Response.json({
      debts: rows,
      total_daily_interest: Number(total_daily.toFixed(2)),
      total_monthly_projection: Number(total_monthly.toFixed(2)),
      cost_of_waiting_per_day: Number(total_daily.toFixed(2)),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}