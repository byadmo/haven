import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function monthKey(d) { return d.toISOString().slice(0, 7); }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
    const txs = (await base44.entities.Transaction.list()).filter((t) => t.date && t.date >= threeMonthsAgo);

    const byMonth = {};
    for (const t of txs) {
      if (t.type !== 'income') continue;
      const m = monthKey(new Date(t.date + 'T00:00:00Z'));
      byMonth[m] = (byMonth[m] || 0) + Math.abs(t.amount || 0);
    }
    const months = Object.keys(byMonth).sort();
    const trailingThree = months.slice(-3).map((m) => byMonth[m]);
    const baseline = trailingThree.length ? Math.min(...trailingThree) : 0;

    const currentKey = monthKey(now);
    const currentMonth = byMonth[currentKey] || 0;

    let surplus = 0;
    let allocation = { emergency_buffer: 0, waterfall_toxic: 0 };
    if (baseline > 0 && currentMonth > baseline * 1.1) {
      surplus = currentMonth - baseline;
      const profiles = await base44.entities.UserFinancialProfile.list();
      const profile = profiles[0];
      const bufferTarget = (profile && profile.emergency_buffer_target) || 2000;
      // estimate current buffer from accounts
      const accounts = await base44.entities.Account.list();
      const liquid = accounts.reduce((s, a) => s + (a.balance || 0), 0);
      const bufferGap = Math.max(0, bufferTarget - liquid);
      const toBuffer = Math.min(bufferGap, surplus * 0.5);
      const toWaterfall = surplus - toBuffer;
      allocation = { emergency_buffer: Number(toBuffer.toFixed(2)), waterfall_toxic: Number(toWaterfall.toFixed(2)) };

      // persist adaptation
      try {
        if (profile) {
          await base44.entities.UserFinancialProfile.update(profile.id, {
            trailing_3m_min_income: Number(baseline.toFixed(2)),
            last_adaptation_date: now.toISOString().slice(0, 10),
          });
        }
      } catch (e) { /* ignore persist errors */ }
    }

    return Response.json({
      baseline_income: Number(baseline.toFixed(2)),
      trailing_3m: trailingThree.map((v) => Number(v.toFixed(2))),
      current_month_income: Number(currentMonth.toFixed(2)),
      surplus_detected: baseline > 0 && currentMonth > baseline * 1.1,
      surplus: Number(surplus.toFixed(2)),
      allocation,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}