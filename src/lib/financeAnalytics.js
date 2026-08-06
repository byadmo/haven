import { startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from "date-fns";
import {
  dedupeDebtsByName,
  activeLiabilities,
  sumAccounts,
  stockCostBasis,
} from "@/lib/netWorth";

/**
 * Live investment market value: uses a live price when available, else falls
 * back to avg_buy_price (cost basis). Returns { total, isLive }.
 */
function investmentMarketValue(stocks = [], prices = {}) {
  let total = 0;
  let liveUsed = 0;
  for (const s of stocks || []) {
    const px = prices[s.symbol];
    const sh = s.shares || 0;
    if (typeof px === "number") {
      total += px * sh;
      liveUsed += 1;
    } else {
      total += (s.avg_buy_price || 0) * sh;
    }
  }
  return { total, isLive: (stocks || []).length > 0 && liveUsed > 0 };
}

/**
 * Pure, synchronous analytics engine — the SINGLE SOURCE OF TRUTH for every
 * derived financial metric in Haven. Given the raw entity arrays, it returns
 * all computed metrics. No fetching, no async; callers memoize over entity
 * arrays.
 *
 * Debt totals honour the existing bug fixes: records are deduped by name
 * (most recent kept) and `status === "paid_off"` is excluded from liability
 * totals.
 */
export function computeAnalytics({
  accounts = [],
  transactions = [],
  debts = [],
  stocks = [],
  stockPrices = {},
} = {}) {
  // ── Balance & Net Worth ───────────────────────────────────────────────
  const totalCash = sumAccounts(accounts);
  const activeDebts = activeLiabilities(debts); // deduped + active only
  const totalDebt = activeDebts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const portfolioCostBasis = stockCostBasis(stocks);
  // Net worth uses LIVE investment market value when prices are available,
  // so every net-worth display in the app agrees on one number.
  const { total: investmentsMarketValue, isLive: investmentsIsLive } =
    investmentMarketValue(stocks, stockPrices);
  const netWorth = totalCash + investmentsMarketValue - totalDebt;

  // ── Income & Expense (current calendar month) ───────────────────────
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const inCurrentMonth = (d) => {
    if (!d) return false;
    try {
      return isWithinInterval(parseISO(d), { start: mStart, end: mEnd });
    } catch {
      return false;
    }
  };

  let currentMonthIncome = 0;
  let currentMonthExpenses = 0;
  const categorySpendingMap = {};
  for (const t of transactions) {
    if (!t.date || !inCurrentMonth(t.date)) continue;
    if (t.type === "income") {
      currentMonthIncome += t.amount || 0;
    } else {
      currentMonthExpenses += t.amount || 0;
      const c = t.category || "uncategorized";
      categorySpendingMap[c] = (categorySpendingMap[c] || 0) + (t.amount || 0);
    }
  }
  const netMonthlyCashFlow = currentMonthIncome - currentMonthExpenses;
  const savingsRate =
    currentMonthIncome > 0
      ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100
      : 0;

  // Lowest monthly income total among the past 3 COMPLETE months.
  const monthIncomeBetween = (s, e) => {
    let inc = 0;
    for (const t of transactions) {
      if (t.type !== "income" || !t.date) continue;
      try {
        if (isWithinInterval(parseISO(t.date), { start: s, end: e })) inc += t.amount || 0;
      } catch {}
    }
    return inc;
  };
  let trailing3MonthMinIncome = Infinity;
  for (let i = 1; i <= 3; i++) {
    const ref = subMonths(now, i);
    trailing3MonthMinIncome = Math.min(
      trailing3MonthMinIncome,
      monthIncomeBetween(startOfMonth(ref), endOfMonth(ref))
    );
  }
  trailing3MonthMinIncome = trailing3MonthMinIncome === Infinity ? 0 : trailing3MonthMinIncome;

  // ── Debt & Risk Ratios ───────────────────────────────────────────────
  const totalMonthlyMinDebtPayments = activeDebts.reduce(
    (s, d) => s + (d.minimum_payment || 0),
    0
  );
  const debtToIncomeRatio =
    currentMonthIncome > 0
      ? (totalMonthlyMinDebtPayments / currentMonthIncome) * 100
      : 0;
  const balAprSum = activeDebts.reduce(
    (s, d) => s + (d.current_balance || 0) * (d.interest_rate || 0),
    0
  );
  const balanceSum = activeDebts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const weightedAverageApr = balanceSum > 0 ? balAprSum / balanceSum : 0;
  const activeDebtCount = activeDebts.length;
  const allDebtsDeduped = dedupeDebtsByName(debts);
  const paidOffDebtCount = allDebtsDeduped.filter(
    (d) => (d.status || "active") === "paid_off"
  ).length;

  // ── Category & Budget ────────────────────────────────────────────────
  const totalSpend = Object.values(categorySpendingMap).reduce((s, v) => s + v, 0);
  const topSpendingCategories = Object.entries(categorySpendingMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
    }));

  const emergencyBufferMonths =
    currentMonthExpenses > 0 ? totalCash / currentMonthExpenses : 0;

  // ── Waterfall allocations (monthly surplus distribution) ─────────────
  const surplus = Math.max(0, netMonthlyCashFlow);
  let remaining = surplus;
  const emergencyShortfall = Math.max(0, currentMonthExpenses - totalCash);
  const emergencyBuffer = Math.min(emergencyShortfall, remaining);
  remaining -= emergencyBuffer;
  const toxicMin = activeDebts
    .filter((d) => (d.interest_rate || 0) > 8)
    .reduce((s, d) => s + (d.minimum_payment || 0), 0);
  const toxicDebt = Math.min(toxicMin, remaining);
  remaining -= toxicDebt;
  const taxAdvantagedGrowth = remaining * 0.5;
  remaining -= taxAdvantagedGrowth;
  const lowMin = activeDebts
    .filter((d) => (d.interest_rate || 0) < 5)
    .reduce((s, d) => s + (d.minimum_payment || 0), 0);
  const lowInterestDebt = Math.min(lowMin, remaining);
  remaining -= lowInterestDebt;
  const surplusRemaining = remaining;
  const waterfallAllocations = {
    emergencyBuffer,
    toxicDebt,
    taxAdvantagedGrowth,
    lowInterestDebt,
    surplusRemaining,
  };

  return {
    totalCash,
    totalDebt,
    portfolioCostBasis,
    investmentsMarketValue,
    investmentsIsLive,
    netWorth,
    currentMonthIncome,
    currentMonthExpenses,
    netMonthlyCashFlow,
    savingsRate,
    trailing3MonthMinIncome,
    totalMonthlyMinDebtPayments,
    debtToIncomeRatio,
    weightedAverageApr,
    activeDebtCount,
    paidOffDebtCount,
    categorySpendingMap,
    topSpendingCategories,
    emergencyBufferMonths,
    waterfallAllocations,
  };
}