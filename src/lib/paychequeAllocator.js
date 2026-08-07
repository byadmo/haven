// Paycheque Allocation engine — monthly recurring commitment, per-paycheque
// requirement, annual income, default vault scaffolding, and the live split
// computation that drives the Paycheque Allocator UI. Pure functions only —
// no React, no API calls.

export const INCOME_FREQ_OPTIONS = [
  { value: "Weekly", label: "Weekly", periodsPerYear: 52, periodsPerMonth: 4.33 },
  { value: "Bi-Weekly", label: "Bi-Weekly", periodsPerYear: 26, periodsPerMonth: 2.165 },
  { value: "Monthly", label: "Monthly", periodsPerYear: 12, periodsPerMonth: 1 },
];

export const ALLOCATION_TYPES = [
  "Fixed Bill",
  "Variable Need",
  "Savings/Investment",
  "Unallocated",
];

export const ALLOCATION_TYPE_LABELS = {
  "Fixed Bill": "Fixed Bill",
  "Variable Need": "Variable Need",
  "Savings/Investment": "Savings / Investment",
  "Unallocated": "Unallocated",
};

// Hex palette for auto-assigning vault colors (and the Add Vault picker).
export const VAULT_COLOR_PALETTE = [
  "#4f46e5", "#22c55e", "#f59e0b", "#0ea5e9", "#ec4899",
  "#8b5cf6", "#14b8a6", "#f97316", "#ef4444", "#3b82f6",
  "#a1a1aa", "#84cc16", "#06b6d4", "#d946ef", "#facc15",
];

// Convert any RecurringBill frequency to its monthly-dollar equivalent.
// weekly = x4.33, biweekly = x2.165, annual = /12, quarterly = /3,
// custom = amount * (days-in-month / interval-days).
export function billMonthlyAmount(bill) {
  const amt = Number(bill?.amount) || 0;
  switch (bill?.frequency) {
    case "weekly": return amt * 4.33;
    case "biweekly": return amt * 2.165;
    case "monthly": return amt;
    case "quarterly": return amt / 3;
    case "annual": return amt / 12;
    case "custom": {
      const days = Number(bill.custom_interval_days) || 30;
      return amt * (30.4375 / Math.max(days, 1));
    }
    default: return amt;
  }
}

// Sum the monthly-dollar commitment of every active, non-rejected bill.
export function totalMonthlyCommitment(bills) {
  return (bills || [])
    .filter((b) => b.is_active && b.ai_review_status !== "rejected")
    .reduce((s, b) => s + billMonthlyAmount(b), 0);
}

// How much of each paycheque must land in the Bills Vault to fully cover the
// monthly recurring commitment, given the user's pay frequency.
export function perPaychequeRequirement(monthly, frequency) {
  const opt = INCOME_FREQ_OPTIONS.find((o) => o.value === frequency);
  if (!opt) return monthly;
  return monthly / opt.periodsPerMonth;
}

export function annualIncome(baseIncome, frequency) {
  const opt = INCOME_FREQ_OPTIONS.find((o) => o.value === frequency);
  const b = Number(baseIncome) || 0;
  return opt ? b * opt.periodsPerYear : 0;
}

export const DEFAULT_VAULT_DEFS = [
  { vault_name: "Bills Vault", allocation_type: "Fixed Bill", color: "#4f46e5", display_order: 1, defaultTarget: 0 },
  { vault_name: "Savings / Investments", allocation_type: "Savings/Investment", color: "#22c55e", display_order: 2, defaultTarget: "10%" },
  { vault_name: "Groceries", allocation_type: "Variable Need", color: "#f59e0b", display_order: 3, defaultTarget: 200 },
  { vault_name: "Transit", allocation_type: "Variable Need", color: "#0ea5e9", display_order: 4, defaultTarget: 100 },
  { vault_name: "Discretionary Buffer", allocation_type: "Unallocated", color: "#a1a1aa", display_order: 5, defaultTarget: 0 },
];

// Build the 5 default vault records to bulkCreate when the user has none.
export function buildDefaultVaultPayloads({ perPaychequeBills, baseIncome }) {
  const base = Number(baseIncome) || 0;
  return DEFAULT_VAULT_DEFS.map((v) => {
    let target = 0;
    if (v.allocation_type === "Fixed Bill") target = perPaychequeBills;
    else if (v.defaultTarget === "10%") target = base * 0.1;
    else if (typeof v.defaultTarget === "number") target = v.defaultTarget;
    return {
      vault_name: v.vault_name,
      allocation_type: v.allocation_type,
      target_allocation: Math.round(target * 100) / 100,
      current_balance: 0,
      color: v.color,
      is_active: true,
      display_order: v.display_order,
    };
  });
}

// Live split computation for the Paycheque Splitter.
// - Fixed Bill vaults: amount = perPaychequeBills (locked, spread evenly if
//   more than one Fixed Bill vault exists).
// - Savings/Investment & Variable Need vaults: amount = target_allocation.
// - Unallocated vaults: amount = income - sum(other committed allocations)
//   (the discretionary cushion, auto-shifts as other vaults change).
// Returns ordered items + committed total + cushion (may be negative = over).
export function computeAllocation({ income, vaults, perPaychequeBills }) {
  const inc = Number(income) || 0;
  const active = (vaults || [])
    .filter((v) => v.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const fixedCount = active.filter((v) => v.allocation_type === "Fixed Bill").length;
  const fixedShare = fixedCount > 0 ? perPaychequeBills / fixedCount : 0;

  let committed = 0;
  const items = active.map((v) => {
    let amount;
    if (v.allocation_type === "Fixed Bill") amount = fixedShare;
    else if (v.allocation_type === "Unallocated") amount = 0; // filled after
    else amount = Number(v.target_allocation) || 0;
    if (v.allocation_type !== "Unallocated") committed += amount;
    return { ...v, amount };
  });

  const cushion = inc - committed;
  items.forEach((it) => {
    if (it.allocation_type === "Unallocated") it.amount = cushion;
  });

  return { items, committed, cushion, income: inc };
}

export const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
export const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);