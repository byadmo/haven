import { parseISO, format, add, addDays } from "date-fns";

// True recurring cadences.
export const RECUR_FREQ = ["weekly", "biweekly", "monthly", "yearly"];

// Match the backend's normalizer so client + server group identically.
export function normalizeDesc(desc) {
  return String(desc || "")
    .replace(/ref[#:]?\s*[a-z0-9]+/gi, "")
    .replace(/#\d+/gi, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function classifyIntervals(diffs) {
  if (diffs.length < 2) return null;
  const within = (target, tol) => diffs.every((d) => Math.abs(d - target) <= tol);
  if (within(7, 2)) return { frequency: "weekly", average_days: 7 };
  if (within(14, 3)) return { frequency: "biweekly", average_days: 14 };
  if (within(30, 4)) return { frequency: "monthly", average_days: 30 };
  if (within(365, 10)) return { frequency: "yearly", average_days: 365 };
  return null;
}

function mode(arr) {
  const c = {};
  arr.forEach((x) => { if (x) c[x] = (c[x] || 0) + 1; });
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
}

function advance(d, f) {
  if (f === "weekly") return addDays(d, 7);
  if (f === "biweekly") return addDays(d, 14);
  if (f === "monthly") return add(d, { months: 1 });
  if (f === "yearly") return add(d, { years: 1 });
  return addDays(d, 30);
}

function nextDueOf(t) {
  let base = t.next_date ? parseISO(t.next_date) : parseISO(t.date);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  let guard = 0;
  while (base < now && guard < 600) { base = advance(base, t.frequency); guard++; }
  return base;
}

const groupKey = (t) => `${t.type || "expense"}::${normalizeDesc(t.description)}`;

// Auto-detect recurring patterns from history (3+ consistent occurrences at
// ~7/14/30/365-day intervals). Each description is collapsed into ONE entry —
// historical occurrences are combined, never listed separately.
export function detectRecurring(transactions) {
  const groups = {};
  for (const t of transactions) {
    if (!t.description) continue;
    const key = groupKey(t);
    if (!key.endsWith("::")) (groups[key] ||= []).push(t);
  }

  const detected = [];
  for (const key of Object.keys(groups)) {
    const items = groups[key].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (items.length < 3) continue;
    const dates = items.map((t) => { try { return new Date(t.date + "T00:00:00Z"); } catch { return null; } }).filter(Boolean);
    if (dates.length < 3) continue;
    const diffs = [];
    for (let i = 1; i < dates.length; i++) diffs.push((dates[i] - dates[i - 1]) / 86400000);
    const pattern = classifyIntervals(diffs);
    if (!pattern) continue;

    const last = items[items.length - 1];
    const avgAmount = items.reduce((s, t) => s + Math.abs(t.amount || 0), 0) / items.length;

    // next predicted occurrence, rolled forward into the future if it's past
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next = new Date(last.date + "T00:00:00Z");
    next.setDate(next.getDate() + Math.round(pattern.average_days));
    let guard = 0;
    while (next < today && guard < 600) { next.setDate(next.getDate() + Math.round(pattern.average_days)); guard++; }

    detected.push({
      normalized: key,
      description: items[0].description,
      type: items[0].type || "expense",
      frequency: pattern.frequency,
      average_amount: Number(avgAmount.toFixed(2)),
      last_date: last.date,
      predicted_next_date: next.toISOString().slice(0, 10),
      occurrences: items.length,
      category: mode(items.map((t) => t.category)) || "uncategorized",
      source: "auto",
    });
  }
  return detected;
}

// One source of truth for both surfaces: auto-detected patterns UNION any
// manually-flagged recurring (is_scheduled + recurring cadence) that wasn't
// auto-detected (e.g. only 1–2 occurrences so far). Deduped by normalized key.
export function getRecurring(transactions) {
  const auto = detectRecurring(transactions);
  const seen = new Set(auto.map((a) => a.normalized));

  const manual = [];
  for (const t of transactions) {
    if (!(t.is_scheduled && RECUR_FREQ.includes(t.frequency))) continue;
    const key = groupKey(t);
    if (!key.endsWith("::") && !seen.has(key)) {
      seen.add(key);
      manual.push({
        normalized: key,
        description: t.description,
        type: t.type || "expense",
        frequency: t.frequency,
        average_amount: Number(Math.abs(t.amount || 0).toFixed(2)),
        last_date: t.date,
        predicted_next_date: format(nextDueOf(t), "yyyy-MM-dd"),
        occurrences: 1,
        category: t.category || "uncategorized",
        source: "manual",
      });
    }
  }

  return [...auto, ...manual].sort((a, b) =>
    a.predicted_next_date < b.predicted_next_date ? -1 : a.predicted_next_date > b.predicted_next_date ? 1 : 0
  );
}