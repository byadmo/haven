// Utilities for the Recurring Bills & Subscriptions page: frequency labels,
// due-date math, category styling, and AI bill detection (reuses the shared
// transaction recurring-pattern detector from src/lib/recurring.js).
import { addDays, addMonths, addYears, parseISO, format } from "date-fns";
import { detectRecurring, normalizeDesc } from "@/lib/recurring";

export const FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annually" },
  { value: "custom", label: "Custom" },
];

export const BILL_CATEGORIES = [
  "Subscription", "Utility", "Rent", "Loan Payment", "Insurance",
  "Phone", "Internet", "Gym", "Other",
];

export function freqLabel(f) {
  return FREQ_OPTIONS.find((o) => o.value === f)?.label || f || "—";
}

export function dayDiff(dateStr) {
  if (!dateStr) return null;
  const d = parseISO(dateStr + "T00:00:00");
  if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

// Advance a due date by one occurrence of its frequency.
export function advanceDueDate(dateStr, frequency, customIntervalDays = 1) {
  const d = parseISO((dateStr || "") + "T00:00:00");
  if (isNaN(d)) return dateStr;
  let nd;
  switch (frequency) {
    case "weekly": nd = addDays(d, 7); break;
    case "biweekly": nd = addDays(d, 14); break;
    case "monthly": nd = addMonths(d, 1); break;
    case "quarterly": nd = addMonths(d, 3); break;
    case "annual": nd = addYears(d, 1); break;
    case "custom": nd = addDays(d, customIntervalDays || 1); break;
    default: return dateStr;
  }
  return format(nd, "yyyy-MM-dd");
}

// Words that mark non-bill line items (interest, fees, transfers) — never
// promote these to recurring bills. They belong in debt tracking, not bills.
const NONBILL_RE = /\b(interest|finance\s*charge|fin\s*charge|late\s*fee|\bfee\b|nsf|overdraft|transfer|tft|tfr)\b/i;

// Map a transaction category → a bill category bucket.
function mapCategory(cat) {
  const c = String(cat || "").toLowerCase();
  if (/sub|spotify|netflix|disney|hulu|itunes|apple|prime|adobe|chatgpt/.test(c)) return "Subscription";
  if (/rent|mortgage/.test(c)) return "Rent";
  if (/loan|credit|minimum/.test(c)) return "Loan Payment";
  if (/insurance/.test(c)) return "Insurance";
  if (/phone|cell|mobile/.test(c)) return "Phone";
  if (/internet|wifi|cable|fiber/.test(c)) return "Internet";
  if (/gym|fitness/.test(c)) return "Gym";
  if (/utility|hydro|electric|gas|water|utilities/.test(c)) return "Utility";
  return "Other";
}

// Run AI recurring detection over the user's transactions and return only the
// candidates that don't already match a tracked bill (by name + rounded
// amount). Each candidate is a ready-to-create RecurringBill in "pending"
// review state. detectRecurring already excludes suppressed payments, groups
// by normalized description, and requires 3+ consistent occurrences.
export function detectBillCandidates(transactions, existingBills = []) {
  const detected = detectRecurring(transactions);
  const exists = new Set(
    (existingBills || []).map((b) => `${normalizeDesc(b.name)}::${Math.round(b.amount || 0)}`)
  );
  const out = [];
  for (const d of detected) {
    if (d.type && d.type !== "expense") continue; // exclude income / payroll
    if (NONBILL_RE.test(d.description || "")) continue; // interest / fees / transfers
    const norm = normalizeDesc(d.description);
    if (!norm) continue;
    const key = `${norm}::${Math.round(d.average_amount)}`;
    if (exists.has(key)) continue; // already tracked (manual, confirmed, OR rejected)
    exists.add(key);
    out.push({
      name: d.description,
      amount: Number(d.average_amount.toFixed(2)),
      frequency: d.frequency,
      custom_interval_days: null,
      next_due_date: d.predicted_next_date,
      category: mapCategory(d.category),
      is_ai_detected: true,
      ai_review_status: "pending",
      is_active: true,
      is_auto_pay: false,
    });
  }
  return out;
}

export function catStyle(cat) {
  const map = {
    Subscription: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    Utility: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    Rent: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    "Loan Payment": "border-rose-400/30 bg-rose-500/10 text-rose-300",
    Insurance: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    Phone: "border-indigo-400/30 bg-indigo-500/10 text-indigo-300",
    Internet: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
    Gym: "border-pink-400/30 bg-pink-500/10 text-pink-300",
    Other: "border-white/15 bg-white/5 text-white/60",
  };
  return map[cat] || map.Other;
}