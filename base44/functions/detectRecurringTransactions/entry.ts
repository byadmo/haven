import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

function normalize(desc) {
  return String(desc || '')
    .replace(/ref[#:]?\s*[a-z0-9]+/gi, '')
    .replace(/#\d+/gi, '')
    .replace(/\d+/g, '')
    .replace(/[^a-z\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function classifyIntervals(diffs) {
  if (diffs.length < 2) return null;
  const avg = diffs.reduce((s, x) => s + x, 0) / diffs.length;
  const within = (target, tol) => diffs.every((d) => Math.abs(d - target) <= tol);
  if (within(7, 2)) return { frequency: 'weekly', average_days: 7 };
  if (within(14, 3)) return { frequency: 'biweekly', average_days: 14 };
  if (within(30, 4)) return { frequency: 'monthly', average_days: 30 };
  if (within(365, 10)) return { frequency: 'yearly', average_days: 365 };
  return null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const txs = await base44.entities.Transaction.list();
    const groups = {};
    for (const t of txs) {
      const key = normalize(t.description);
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    const detected = [];
    for (const key of Object.keys(groups)) {
      const items = groups[key].sort((a, b) => (a.date < b.date ? -1 : 1));
      if (items.length < 3) continue;
      const dates = items.map((t) => new Date(t.date + 'T00:00:00Z'));
      const diffs = [];
      for (let i = 1; i < dates.length; i++) diffs.push((dates[i] - dates[i - 1]) / 86400000);
      const pattern = classifyIntervals(diffs);
      if (!pattern) continue;

      const last = items[items.length - 1];
      const lastDate = new Date(last.date + 'T00:00:00Z');
      lastDate.setDate(lastDate.getDate() + Math.round(pattern.average_days));
      const predictedNext = lastDate.toISOString().slice(0, 10);
      const avgAmount = items.reduce((s, t) => s + Math.abs(t.amount || 0), 0) / items.length;
      detected.push({
        description: items[0].description,
        normalized: key,
        frequency: pattern.frequency,
        average_amount: Number(avgAmount.toFixed(2)),
        last_date: last.date,
        predicted_next_date: predictedNext,
        occurrences: items.length,
        ids: items.map((t) => t.id),
      });

      // update matched records
      for (const t of items) {
        if (t.is_scheduled && t.frequency === pattern.frequency && t.next_date === predictedNext) continue;
        try {
          await base44.entities.Transaction.update(t.id, {
            is_scheduled: true,
            frequency: pattern.frequency,
            next_date: predictedNext,
          });
        } catch (e) { /* skip individual failures */ }
      }
    }

    return Response.json({ detected, count: detected.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}