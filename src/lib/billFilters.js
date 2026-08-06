// Shared filters so interest/fee micro-charges never surface as "bills"
// anywhere in the app. Interest charges come from statement imports (not real
// bills the user pays), so they're excluded by description pattern + amount.

// Case-insensitive patterns that mark a line as an interest/finance charge
// rather than a genuine bill or recurring payment.
const INTEREST_FEE_PATTERN = /\b(interest|interest\s+charge|finance\s+charge|cash\s+advance\s+interest|fin\s+charge|interest\s+accrual)\b/i;

// A bill must be at least this large to be "actionable" — tiny auto-accrued
// charges ($0.4x) are noise, not bills.
export const MIN_BILL_AMOUNT = 5;

export function isInterestOrFee(description) {
  return INTEREST_FEE_PATTERN.test(String(description || ""));
}

// Genuine upcoming bills: a scheduled EXPENSE, meaningful amount, not an
// interest/fee. Scheduled income (e.g. Payroll Deposit) is NEVER a bill.
export function isGenuineBill(t) {
  if (!t || !t.is_scheduled || !t.next_date) return false;
  if (t.recurring_suppressed) return false;
  if ((t.type || "expense") !== "expense") return false;
  if (isInterestOrFee(t.description)) return false;
  if (!t.amount || Math.abs(t.amount) < MIN_BILL_AMOUNT) return false;
  return true;
}

// Filter + de-duplicate near-identical scheduled entries (same description +
// same next_date collapsed to one row). Dedup handles legacy records that
// were previously auto-promoted into duplicate scheduled rows.
export function filterGenuineBills(transactions) {
  const seen = new Set();
  const out = [];
  for (const t of transactions || []) {
    if (!isGenuineBill(t)) continue;
    const key = `${String(t.description || "").trim().toLowerCase()}::${t.next_date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}