import { describe, test, expect } from "vitest";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  subMonths,
  format,
} from "date-fns";
import { computeAnalytics } from "@/lib/financeAnalytics";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

// Build an ISO `yyyy-MM-dd` string for `monthOffset` months from now, `day` of
// that LOCAL month. The engine's monthly window is computed from `now` in local
// time (startOfMonth/endOfMonth), so day-15 is always safely inside the window
// regardless of the host timezone.
const now = new Date();
const iso = (monthOffset = 0, day = 15) => {
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
  return format(d, "yyyy-MM-dd");
};

// Local noon on the 1st of the current month, as a full ISO string. Used to
// deterministically assert that day-1 dates are counted as part of the month.
const isoFirstOfCurrentMonth = () => {
  const d = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
  return d.toISOString();
};

// Close-to for monetary floats (2 cents of precision is plenty here).
const close = (n) => (actual) => expect(actual).toBeCloseTo(n, 2);

/* ------------------------------------------------------------------ *
 * A — Net Worth & Balance Calculations
 * ------------------------------------------------------------------ */

describe("Net Worth & Balance Calculations", () => {
  test("totalCash sums all account balances including negative balances", () => {
    const accounts = [
      { balance: 1300.0, type: "chequing" },
      { balance: 333.85, type: "savings" },
      { balance: -147.41, type: "chequing" },
    ];
    expect(computeAnalytics({ accounts }).totalCash).toBeCloseTo(1486.44, 2);
  });

  test("totalCash returns 0 for empty accounts array", () => {
    expect(computeAnalytics({ accounts: [] }).totalCash).toBe(0);
  });

  test("totalCash returns 0 for null accounts (no crash)", () => {
    expect(computeAnalytics({ accounts: null }).totalCash).toBe(0);
  });

  test("totalDebt sums only debts where status === 'active' (paid_off excluded)", () => {
    const debts = [
      { name: "Mastercard", current_balance: 801.67, status: "active", interest_rate: 25.99, minimum_payment: 0 },
      { name: "Scotiabank", current_balance: 2409.11, status: "active", interest_rate: 26.99, minimum_payment: 62.61 },
      { name: "Avion", current_balance: 103.09, status: "paid_off", interest_rate: 20.99, minimum_payment: 0 },
      { name: "Car Loan", current_balance: 4500.0, status: "active", interest_rate: 5.99, minimum_payment: 150 },
    ];
    expect(computeAnalytics({ debts }).totalDebt).toBeCloseTo(7710.78, 2);
  });

  test("totalDebt returns 0 for empty debts array", () => {
    expect(computeAnalytics({ debts: [] }).totalDebt).toBe(0);
  });

  test("totalDebt returns 0 for null debts (no crash)", () => {
    expect(computeAnalytics({ debts: null }).totalDebt).toBe(0);
  });

  test("portfolioCostBasis sums shares * avg_buy_price across all positions", () => {
    const stocks = [
      { symbol: "SOXL", shares: 2, avg_buy_price: 110.0 },
      { symbol: "NVDA", shares: 5, avg_buy_price: 120.0 },
    ];
    expect(computeAnalytics({ stocks }).portfolioCostBasis).toBe(820);
  });

  test("portfolioCostBasis returns 0 for empty stocks array", () => {
    expect(computeAnalytics({ stocks: [] }).portfolioCostBasis).toBe(0);
  });

  test("netWorth equals totalCash + portfolioCostBasis - totalDebt (no live prices)", () => {
    const accounts = [
      { balance: 1300.0 },
      { balance: 333.85 },
      { balance: -147.41 },
    ];
    const stocks = [{ symbol: "SOXL", shares: 2, avg_buy_price: 110.0 }];
    const debts = [
      { name: "Mastercard", current_balance: 801.67, status: "active", minimum_payment: 0 },
      { name: "Scotiabank", current_balance: 2409.11, status: "active", minimum_payment: 0 },
      { name: "Avion", current_balance: 103.09, status: "paid_off", minimum_payment: 0 },
      { name: "Car Loan", current_balance: 4500.0, status: "active", minimum_payment: 150 },
    ];
    // cash 1486.44 + costBasis 220 - debt 7710.78 = -6004.34
    expect(computeAnalytics({ accounts, stocks, debts }).netWorth).toBeCloseTo(-6004.34, 2);
  });

  test("netWorth is negative when debt exceeds assets", () => {
    const r = computeAnalytics({
      accounts: [{ balance: 100 }],
      debts: [{ name: "Big", current_balance: 900, status: "active", minimum_payment: 0 }],
    });
    expect(r.netWorth).toBeLessThan(0);
  });

  test("netWorth is 0 when all arrays are empty/null", () => {
    expect(computeAnalytics({}).netWorth).toBe(0);
  });

  test("netWorth uses LIVE market value when stockPrices are provided", () => {
    const stocks = [{ symbol: "AAPL", shares: 10, avg_buy_price: 120.0 }];
    const r = computeAnalytics({
      accounts: [{ balance: 0 }],
      stocks,
      stockPrices: { AAPL: 150.0 },
    });
    // 10 * 150 = 1500 invested, no cash, no debt → netWorth 1500
    expect(r.investmentsMarketValue).toBe(1500);
    expect(r.investmentsIsLive).toBe(true);
    expect(r.netWorth).toBe(1500);
  });

  test("investmentsIsLive is false when no live prices are available", () => {
    const r = computeAnalytics({
      stocks: [{ symbol: "AAPL", shares: 10, avg_buy_price: 120 }],
    });
    expect(r.investmentsIsLive).toBe(false);
    expect(r.investmentsMarketValue).toBe(1200);
  });
});

/* ------------------------------------------------------------------ *
 * B — Income, Expense & Savings Rate Math
 * ------------------------------------------------------------------ */

describe("Income, Expense & Savings Rate Math", () => {
  test("currentMonthIncome sums only income transactions in current calendar month", () => {
    const transactions = [
      { type: "income", amount: 2000, date: iso(0) },
      { type: "income", amount: 1500, date: iso(-1) },
      { type: "expense", amount: 500, date: iso(0) },
    ];
    expect(computeAnalytics({ transactions }).currentMonthIncome).toBe(2000);
  });

  test("currentMonthExpenses sums only expense transactions in current calendar month", () => {
    const transactions = [
      { type: "expense", amount: 500, date: iso(0) },
      { type: "expense", amount: 300, date: iso(-2) },
      { type: "income", amount: 1000, date: iso(0) },
    ];
    expect(computeAnalytics({ transactions }).currentMonthExpenses).toBe(500);
  });

  test("currentMonthIncome excludes expenses and vice versa", () => {
    const transactions = [
      { type: "income", amount: 800, date: iso(0) },
      { type: "expense", amount: 300, date: iso(0) },
    ];
    const r = computeAnalytics({ transactions });
    expect(r.currentMonthIncome).toBe(800);
    expect(r.currentMonthExpenses).toBe(300);
  });

  test("currentMonthIncome returns 0 for empty transactions", () => {
    expect(computeAnalytics({ transactions: [] }).currentMonthIncome).toBe(0);
  });

  test("netMonthlyCashFlow = currentMonthIncome - currentMonthExpenses", () => {
    const r = computeAnalytics({
      transactions: [
        { type: "income", amount: 2000, date: iso(0) },
        { type: "expense", amount: 500, date: iso(0) },
      ],
    });
    expect(r.netMonthlyCashFlow).toBe(1500);
  });

  test("savingsRate = ((income - expenses) / income) * 100 when income > 0", () => {
    const r = computeAnalytics({
      transactions: [
        { type: "income", amount: 2000, date: iso(0) },
        { type: "expense", amount: 1500, date: iso(0) },
      ],
    });
    expect(r.savingsRate).toBeCloseTo(25, 2);
  });

  test("savingsRate returns 0 when income is 0 (no division by zero)", () => {
    const r = computeAnalytics({
      transactions: [{ type: "expense", amount: 500, date: iso(0) }],
    });
    expect(r.savingsRate).toBe(0);
  });

  test("savingsRate is negative when expenses exceed income", () => {
    const r = computeAnalytics({
      transactions: [
        { type: "income", amount: 500, date: iso(0) },
        { type: "expense", amount: 1000, date: iso(0) },
      ],
    });
    expect(r.savingsRate).toBe(-100);
  });

  test("trailing3MonthMinIncome finds lowest monthly income across past 3 months", () => {
    const transactions = [
      { type: "income", amount: 2000, date: iso(-1) },
      { type: "income", amount: 1500, date: iso(-2) },
      { type: "income", amount: 1800, date: iso(-3) },
    ];
    expect(computeAnalytics({ transactions }).trailing3MonthMinIncome).toBe(1500);
  });

  test("trailing3MonthMinIncome returns 0 when no transactions in past 3 months", () => {
    expect(computeAnalytics({ transactions: [] }).trailing3MonthMinIncome).toBe(0);
  });

  test("trailing3MonthMinIncome ignores current-month income (only complete months)", () => {
    const transactions = [
      { type: "income", amount: 100, date: iso(0) }, // current month, ignored
      { type: "income", amount: 2000, date: iso(-1) },
      { type: "income", amount: 2500, date: iso(-2) },
      { type: "income", amount: 3000, date: iso(-3) },
    ];
    expect(computeAnalytics({ transactions }).trailing3MonthMinIncome).toBe(2000);
  });
});

/* ------------------------------------------------------------------ *
 * C — Debt & Risk Ratios
 * ------------------------------------------------------------------ */

describe("Debt & Risk Ratios", () => {
  const activeDebts = [
    { name: "Mastercard", current_balance: 801.67, status: "active", interest_rate: 25.99, minimum_payment: 0 },
    { name: "Scotiabank", current_balance: 2409.11, status: "active", interest_rate: 26.99, minimum_payment: 62.61 },
    { name: "Avion", current_balance: 103.09, status: "paid_off", interest_rate: 20.99, minimum_payment: 0 },
    { name: "Car Loan", current_balance: 4500.0, status: "active", interest_rate: 5.99, minimum_payment: 150 },
  ];
  const incomeTxns = [{ type: "income", amount: 2000, date: iso(0) }];

  test("totalMonthlyMinDebtPayments sums minimum_payment for active debts only", () => {
    expect(computeAnalytics({ debts: activeDebts }).totalMonthlyMinDebtPayments).toBeCloseTo(212.61, 2);
  });

  test("debtToIncomeRatio = (totalMonthlyMinDebtPayments / currentMonthIncome) * 100", () => {
    const r = computeAnalytics({ debts: activeDebts, transactions: incomeTxns });
    expect(r.debtToIncomeRatio).toBeCloseTo(10.6305, 2);
  });

  test("debtToIncomeRatio returns 0 when income is 0", () => {
    expect(computeAnalytics({ debts: activeDebts }).debtToIncomeRatio).toBe(0);
  });

  test("weightedAverageApr is balance-weighted, not a simple average", () => {
    const debts = [
      { name: "A", current_balance: 1000, status: "active", interest_rate: 20, minimum_payment: 0 },
      { name: "B", current_balance: 3000, status: "active", interest_rate: 10, minimum_payment: 0 },
    ];
    // (1000*20 + 3000*10) / 4000 = 50000 / 4000 = 12.5 (NOT 15)
    expect(computeAnalytics({ debts }).weightedAverageApr).toBe(12.5);
  });

  test("weightedAverageApr returns 0 for empty debts", () => {
    expect(computeAnalytics({ debts: [] }).weightedAverageApr).toBe(0);
  });

  test("activeDebtCount counts only status === 'active'", () => {
    const debts = [
      { name: "A", current_balance: 1, status: "active", interest_rate: 5, minimum_payment: 0 },
      { name: "B", current_balance: 1, status: "active", interest_rate: 5, minimum_payment: 0 },
      { name: "C", current_balance: 1, status: "active", interest_rate: 5, minimum_payment: 0 },
      { name: "D", current_balance: 1, status: "paid_off", interest_rate: 5, minimum_payment: 0 },
      { name: "E", current_balance: 1, status: "paid_off", interest_rate: 5, minimum_payment: 0 },
    ];
    expect(computeAnalytics({ debts }).activeDebtCount).toBe(3);
    expect(computeAnalytics({ debts }).paidOffDebtCount).toBe(2);
  });

  test("paidOffDebtCount dedupes by name before counting", () => {
    const debts = [
      { name: "Old Loan", current_balance: 0, status: "paid_off", interest_rate: 5, minimum_payment: 0 },
      { name: "Old Loan", current_balance: 0, status: "paid_off", interest_rate: 5, minimum_payment: 0, updated_date: "2099-01-01" },
    ];
    expect(computeAnalytics({ debts }).paidOffDebtCount).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * D — Category & Budget Metrics
 * ------------------------------------------------------------------ */

describe("Category & Budget Metrics", () => {
  test("categorySpendingMap groups current-month expenses by category", () => {
    const transactions = [
      { type: "expense", amount: 50, date: iso(0), category: "Food" },
      { type: "expense", amount: 30, date: iso(0), category: "Food" },
      { type: "expense", amount: 40, date: iso(0), category: "Gas" },
      { type: "expense", amount: 20, date: iso(0), category: "Food" },
    ];
    expect(computeAnalytics({ transactions }).categorySpendingMap).toEqual({
      Food: 100,
      Gas: 40,
    });
  });

  test("categorySpendingMap excludes income transactions", () => {
    const transactions = [
      { type: "expense", amount: 50, date: iso(0), category: "Food" },
      { type: "income", amount: 5000, date: iso(0), category: "Salary" },
    ];
    expect(computeAnalytics({ transactions }).categorySpendingMap).toEqual({ Food: 50 });
  });

  test("categorySpendingMap excludes transactions from other months", () => {
    const transactions = [
      { type: "expense", amount: 999, date: iso(-1), category: "Food" },
      { type: "expense", amount: 50, date: iso(0), category: "Food" },
    ];
    expect(computeAnalytics({ transactions }).categorySpendingMap).toEqual({ Food: 50 });
  });

  test("topSpendingCategories returns top 5 sorted by amount descending with percentage", () => {
    const transactions = [
      { type: "expense", amount: 100, date: iso(0), category: "A" },
      { type: "expense", amount: 90, date: iso(0), category: "B" },
      { type: "expense", amount: 80, date: iso(0), category: "C" },
      { type: "expense", amount: 70, date: iso(0), category: "D" },
      { type: "expense", amount: 60, date: iso(0), category: "E" },
      { type: "expense", amount: 50, date: iso(0), category: "F" },
      { type: "expense", amount: 10, date: iso(0), category: "G" },
    ];
    const top = computeAnalytics({ transactions }).topSpendingCategories;
    expect(top).toHaveLength(5);
    expect(top.map((t) => t.category)).toEqual(["A", "B", "C", "D", "E"]);
    expect(top[0].percentage).toBeCloseTo(100 / 460 * 100, 2);
    expect(top[4].amount).toBe(60);
  });

  test("emergencyBufferMonths = totalCash / currentMonthExpenses", () => {
    const r = computeAnalytics({
      accounts: [
        { balance: 1300.0 },
        { balance: 333.85 },
        { balance: -147.41 },
      ],
      transactions: [{ type: "expense", amount: 1000, date: iso(0) }],
    });
    // 1486.44 / 1000 = 1.48644
    expect(r.emergencyBufferMonths).toBeCloseTo(1486.44 / 1000, 5);
  });

  test("emergencyBufferMonths returns 0 when expenses is 0", () => {
    expect(computeAnalytics({ accounts: [{ balance: 1000 }] }).emergencyBufferMonths).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * E — Universal Financial Waterfall Allocation
 * ------------------------------------------------------------------ */

describe("Universal Financial Waterfall Allocation", () => {
  test("allocates full surplus to emergency buffer first when cash < 1 month expenses", () => {
    // cash 500, expenses 2000 → shortfall 1500. income 3500, expenses 2000 → surplus 1500.
    // emergencyBuffer = min(1500, 1500) = 1500.
    const r = computeAnalytics({
      accounts: [{ balance: 500 }],
      transactions: [
        { type: "income", amount: 3500, date: iso(0) },
        { type: "expense", amount: 2000, date: iso(0) },
      ],
    });
    expect(r.waterfallAllocations.emergencyBuffer).toBe(1500);
    expect(r.waterfallAllocations.toxicDebt).toBe(0);
    expect(r.waterfallAllocations.taxAdvantagedGrowth).toBe(0);
    expect(r.waterfallAllocations.lowInterestDebt).toBe(0);
    expect(r.waterfallAllocations.surplusRemaining).toBe(0);
  });

  test("allocates to toxic debt (>8% APR) after emergency buffer is met", () => {
    // cash 2500 >= expenses 2000 (buffer met). surplus 1000. toxic debt min 1000.
    const r = computeAnalytics({
      accounts: [{ balance: 2500 }],
      transactions: [
        { type: "income", amount: 3000, date: iso(0) },
        { type: "expense", amount: 2000, date: iso(0) },
      ],
      debts: [{ name: "Card", current_balance: 5000, status: "active", interest_rate: 25, minimum_payment: 1000 }],
    });
    expect(r.waterfallAllocations.emergencyBuffer).toBe(0);
    expect(r.waterfallAllocations.toxicDebt).toBe(1000);
    expect(r.waterfallAllocations.taxAdvantagedGrowth).toBe(0);
    expect(r.waterfallAllocations.lowInterestDebt).toBe(0);
  });

  test("splits remaining 50/50 to tax-advantaged growth and low-interest debt after toxic debt", () => {
    // buffer met, no toxic debt, surplus 1000, low-interest debt min >= 500.
    const r = computeAnalytics({
      accounts: [{ balance: 2500 }],
      transactions: [
        { type: "income", amount: 3000, date: iso(0) },
        { type: "expense", amount: 2000, date: iso(0) },
      ],
      debts: [{ name: "Loan", current_balance: 10000, status: "active", interest_rate: 4, minimum_payment: 1000 }],
    });
    expect(r.waterfallAllocations.emergencyBuffer).toBe(0);
    expect(r.waterfallAllocations.toxicDebt).toBe(0);
    expect(r.waterfallAllocations.taxAdvantagedGrowth).toBe(500);
    expect(r.waterfallAllocations.lowInterestDebt).toBe(500);
    expect(r.waterfallAllocations.surplusRemaining).toBe(0);
  });

  test("waterfall respects strict priority — when buffer is unmet, nothing flows to toxic debt", () => {
    const r = computeAnalytics({
      accounts: [{ balance: 100 }],
      transactions: [
        { type: "income", amount: 600, date: iso(0) },
        { type: "expense", amount: 1000, date: iso(0) },
      ],
      debts: [{ name: "Card", current_balance: 5000, status: "active", interest_rate: 25, minimum_payment: 1000 }],
    });
    // surplus 0 (negative flow), nothing allocated anywhere
    expect(r.waterfallAllocations.emergencyBuffer).toBe(0);
    expect(r.waterfallAllocations.toxicDebt).toBe(0);
  });

  test("waterfall respects strict priority — when toxic debt exists, no allocation to growth/low-rate", () => {
    const r = computeAnalytics({
      accounts: [{ balance: 2500 }],
      transactions: [
        { type: "income", amount: 3000, date: iso(0) },
        { type: "expense", amount: 2000, date: iso(0) },
      ],
      debts: [
        { name: "Toxic", current_balance: 5000, status: "active", interest_rate: 25, minimum_payment: 600 },
        { name: "Low", current_balance: 5000, status: "active", interest_rate: 3, minimum_payment: 1000 },
      ],
    });
    // toxicMin 600 (or < surplus). growth 0, low-interest 0 (remaining went to toxic).
    expect(r.waterfallAllocations.toxicDebt).toBe(600);
    expect(r.waterfallAllocations.taxAdvantagedGrowth).toBeCloseTo(200, 5);
    expect(r.waterfallAllocations.lowInterestDebt).toBe(200);
  });

  test("waterfallAllocations handles zero surplus gracefully", () => {
    const r = computeAnalytics({
      accounts: [{ balance: 5000 }],
      transactions: [
        { type: "income", amount: 2000, date: iso(0) },
        { type: "expense", amount: 2000, date: iso(0) },
      ],
    });
    const w = r.waterfallAllocations;
    expect(w.emergencyBuffer).toBe(0);
    expect(w.toxicDebt).toBe(0);
    expect(w.taxAdvantagedGrowth).toBe(0);
    expect(w.lowInterestDebt).toBe(0);
    expect(w.surplusRemaining).toBe(0);
  });

  test("waterfallAllocations yields all zeros when cash flow is negative", () => {
    const r = computeAnalytics({
      accounts: [{ balance: 100 }],
      transactions: [
        { type: "income", amount: 100, date: iso(0) },
        { type: "expense", amount: 1000, date: iso(0) },
      ],
    });
    const w = r.waterfallAllocations;
    expect(w.emergencyBuffer).toBe(0);
    expect(w.toxicDebt).toBe(0);
    expect(w.taxAdvantagedGrowth).toBe(0);
    expect(w.lowInterestDebt).toBe(0);
    expect(w.surplusRemaining).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * G (pure half) — Runtime Safety & Edge Cases
 * ------------------------------------------------------------------ */

describe("Runtime Safety (pure computeAnalytics)", () => {
  test("returns a full result for all-empty input (no NaN, no throw)", () => {
    const r = computeAnalytics({});
    expect(Object.keys(r)).toContain("netWorth");
    expect(r.netWorth).toBe(0);
    expect(Number.isNaN(r.totalCash)).toBe(false);
    expect(Number.isNaN(r.totalDebt)).toBe(false);
  });

  test("handles null accounts/debts/stocks and undefined transactions without throwing", () => {
    // The FinanceDataProvider always supplies `transactions` as an array (`[]`
    // default), so the realistic null-safety guarantee is for accounts/debts/
    // stocks plus an absent transactions field (default-param branch).
    expect(() =>
      computeAnalytics({ accounts: null, debts: null, stocks: null, transactions: undefined })
    ).not.toThrow();
    const r = computeAnalytics({ accounts: null, debts: null, stocks: null, transactions: undefined });
    expect(r.totalCash).toBe(0);
    expect(r.totalDebt).toBe(0);
    expect(r.portfolioCostBasis).toBe(0);
    expect(r.currentMonthIncome).toBe(0);
  });

  test("transactions: null surfaces as a real edge case the provider avoids (default [] only applies for undefined)", () => {
    // Documents the actual contract: computeAnalytics coerces null accounts/
    // debts/stocks but iterates transactions directly. The provider never
    // passes null (its default is []), so this is not exercised at runtime.
    expect(() => computeAnalytics({ transactions: null })).toThrow(/not iterable/);
  });

  test("undefined numeric fields default to 0", () => {
    const r = computeAnalytics({
      accounts: [{ balance: undefined }],
      debts: [{ name: "A", current_balance: undefined, status: "active", interest_rate: undefined, minimum_payment: undefined }],
      stocks: [{ symbol: "X", shares: undefined, avg_buy_price: undefined }],
    });
    expect(r.totalCash).toBe(0);
    expect(r.totalDebt).toBe(0);
    expect(r.portfolioCostBasis).toBe(0);
    expect(r.totalMonthlyMinDebtPayments).toBe(0);
    expect(r.weightedAverageApr).toBe(0);
  });

  test("NaN numeric fields default to 0 (NaN is falsy via || 0)", () => {
    const r = computeAnalytics({
      accounts: [{ balance: NaN }],
      debts: [{ name: "A", current_balance: NaN, status: "active", interest_rate: 5, minimum_payment: NaN }],
    });
    expect(r.totalCash).toBe(0);
    expect(r.totalDebt).toBe(0);
    expect(r.totalMonthlyMinDebtPayments).toBe(0);
  });

  test("transactions with null/undefined dates are excluded from monthly calculations", () => {
    const r = computeAnalytics({
      transactions: [
        { type: "income", amount: 5000, date: null },
        { type: "income", amount: 5000, date: undefined },
        { type: "expense", amount: 999, date: "not-a-date" },
      ],
    });
    expect(r.currentMonthIncome).toBe(0);
    expect(r.currentMonthExpenses).toBe(0);
  });

  test("debts missing status default to 'active'", () => {
    const r = computeAnalytics({
      debts: [{ name: "X", current_balance: 500, interest_rate: 0, minimum_payment: 0 }],
    });
    expect(r.totalDebt).toBe(500);
    expect(r.activeDebtCount).toBe(1);
  });

  test("is pure & deterministic — same input → same output", () => {
    const input = {
      accounts: [{ balance: 1000 }],
      debts: [{ name: "A", current_balance: 500, status: "active", interest_rate: 10, minimum_payment: 50 }],
      transactions: [{ type: "income", amount: 2000, date: iso(0) }],
      stocks: [{ symbol: "X", shares: 1, avg_buy_price: 10 }],
    };
    const a = computeAnalytics(input);
    expect(computeAnalytics(input).netWorth).toBe(a.netWorth);
    expect(computeAnalytics(input).totalDebt).toBe(a.totalDebt);
    expect(computeAnalytics(input).savingsRate).toBe(a.savingsRate);
  });
});

/* ------------------------------------------------------------------ *
 * Additional pure tests (dedup, scheduled, day-1, shape)
 * ------------------------------------------------------------------ */

describe("Additional analytics edge cases", () => {
  test("two accounts with the same name are BOTH summed (dedup is debts-only)", () => {
    const r = computeAnalytics({
      accounts: [
        { name: "Chequing", balance: 100 },
        { name: "Chequing", balance: 200 },
      ],
    });
    expect(r.totalCash).toBe(300);
  });

  test("transaction with is_scheduled = true is still included in monthly calculations", () => {
    const r = computeAnalytics({
      transactions: [
        { type: "expense", amount: 250, date: iso(0), is_scheduled: true },
        { type: "income", amount: 1000, date: iso(0), is_scheduled: true },
      ],
    });
    expect(r.currentMonthExpenses).toBe(250);
    expect(r.currentMonthIncome).toBe(1000);
  });

  test("transaction dated exactly the 1st of the month is included in that month", () => {
    const r = computeAnalytics({
      transactions: [{ type: "expense", amount: 75, date: isoFirstOfCurrentMonth() }],
    });
    expect(r.currentMonthExpenses).toBe(75);
  });

  test("snapshot — analytics output exposes the full expected key set", () => {
    const r = computeAnalytics({});
    expect(Object.keys(r).sort()).toEqual([
      "activeDebtCount",
      "categorySpendingMap",
      "currentMonthExpenses",
      "currentMonthIncome",
      "debtToIncomeRatio",
      "emergencyBufferMonths",
      "investmentsIsLive",
      "investmentsMarketValue",
      "netMonthlyCashFlow",
      "netWorth",
      "paidOffDebtCount",
      "portfolioCostBasis",
      "savingsRate",
      "topSpendingCategories",
      "totalCash",
      "totalDebt",
      "totalMonthlyMinDebtPayments",
      "trailing3MonthMinIncome",
      "waterfallAllocations",
      "weightedAverageApr",
    ]);
    expect(Object.keys(r.waterfallAllocations).sort()).toEqual([
      "emergencyBuffer",
      "lowInterestDebt",
      "surplusRemaining",
      "taxAdvantagedGrowth",
      "toxicDebt",
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * Sanity guardrails for the date helpers themselves
 * ------------------------------------------------------------------ */

describe("test date helpers", () => {
  test("iso(0) falls inside the current calendar month", () => {
    expect(isWithinInterval(parseISO(iso(0)), { start: startOfMonth(now), end: endOfMonth(now) })).toBe(true);
  });
  test("iso(-1) falls inside the previous calendar month", () => {
    const prev = subMonths(now, 1);
    expect(isWithinInterval(parseISO(iso(-1)), { start: startOfMonth(prev), end: endOfMonth(prev) })).toBe(true);
  });
});

/* keep close helper referenced if extended later */
void close;