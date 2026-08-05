import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const since = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const txs = (await base44.entities.Transaction.list()).filter((t) => t.type === 'expense' && t.date && t.date >= since);

    // 7 days x 24 hours; transactions only carry a date (no time), so spend lands at noon.
    const counts = Array.from({ length: 7 }, () => Array(24).fill(0));
    const totals = Array.from({ length: 7 }, () => 0);
    for (const t of txs) {
      const d = new Date(t.date + 'T12:00:00Z');
      const dow = d.getUTCDay();
      const amt = Math.abs(t.amount || 0);
      counts[dow][12] += amt;
      totals[dow] += amt;
    }

    let peakDay = 0, peakDayVal = 0, quietDay = 0, quietDayVal = Infinity;
    for (let i = 0; i < 7; i++) {
      if (totals[i] > peakDayVal) { peakDayVal = totals[i]; peakDay = i; }
      if (totals[i] < quietDayVal) { quietDayVal = totals[i]; quietDay = i; }
    }

    let peakHour = 12, peakHourVal = 0;
    for (let h = 0; h < 24; h++) {
      let v = 0;
      for (let d = 0; d < 7; d++) v += counts[d][h];
      if (v > peakHourVal) { peakHourVal = v; peakHour = h; }
    }

    return Response.json({
      matrix: counts.map((row) => row.map((v) => Number(v.toFixed(2)))),
      day_labels: DOW,
      total_spending: Number(totals.reduce((s, x) => s + x, 0).toFixed(2)),
      peak_spending_day: DOW[peakDay],
      peak_spending_hour: peakHour,
      quietest_day: DOW[quietDay],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}