// Auto-categorize transactions whose category is empty/null, based on
// description patterns. Runs once on load to backfill legacy imported rows
// so the Spending donut / category breakdown never shows "uncategorized".

const RULES = [
  { re: /online banking transfer|e-transfer sent|e-transfer\s*-\s*autodeposit|e-transfer request fulfilled/i, cat: "Transfer" },
  { re: /investment ws investments|ws investments/i, cat: "Investment" },
  { re: /payroll deposit/i, cat: "Income" },
  { re: /misc payment shopify/i, cat: "Income" },
  { re: /fee extra debit/i, cat: "Bank Fees" },
];

export function categorizeDescription(description = "") {
  const d = String(description || "");
  for (const r of RULES) if (r.re.test(d)) return r.cat;
  return "Other";
}

// Returns [{ id, category }] for every transaction missing a category.
export function computeCategoryUpdates(transactions = []) {
  const out = [];
  const seen = new Set();
  for (const t of transactions || []) {
    if (!t || !t.id) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    if (t.category && String(t.category).trim()) continue;
    out.push({ id: t.id, category: categorizeDescription(t.description) });
  }
  return out;
}