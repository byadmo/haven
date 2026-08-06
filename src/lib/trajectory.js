// Pre-computed financial trajectory engine ("Scrubbable Timeline" backing store).
// Runs the full 60-month forecast ONCE per data change — the playhead just indexes
// the resulting array, so dragging it never recomputes heavy debt math.
import { addMonths } from "date-fns";

const WEEK_TO_MONTH = 52 / 12;

/**
 * @param {Object} input
 * @param {Array} input.debts        - liability records
 * @param {Array} input.accounts     - cash accounts
 * @param {Array} input.transactions - used only for recurring monthly flow
 * @param {number} input.months      - forecast horizon (default 60)
 * @param {"avalanche"|"snowball"} input.method
 * @returns {{ series: Array, keyframes: number[], order: Array }}
 */
export function computeTrajectory({
  debts = [], accounts = [], transactions = [],
  months = 60, method = "avalanche", extraPayment = 0, incomeAdjust = 0,
  stopAfterDebtFree = false,
} = {}) {
  const now = new Date();
  const startingCash = Math.max(0, accounts.reduce((s, a) => s + (a.balance || 0), 0));

  // Recurring monthly net flow (project the same schedule forward).
  const recurring = transactions.filter((t) => t.is_scheduled || (t.frequency && t.frequency !== "one_time"));
  let recIn = 0, recOut = 0;
  recurring.forEach((t) => {
    const factor = t.frequency === "weekly" ? WEEK_TO_MONTH : 1; // monthly ents tier
    if (t.type === "income") recIn += (t.amount || 0) * factor;
    else recOut += (t.amount || 0) * factor;
  });
  const monthlyNet = (recIn - recOut) * (1 + (incomeAdjust || 0) / 100);

  const active = debts
    .map((d) => ({
      id: d.id, name: d.name,
      balance: d.current_balance || 0,
      apr: d.interest_rate || 0,
      min: d.minimum_payment || 0,
    }))
    .filter((d) => d.balance > 0.005);

  const order = [...active].sort((a, b) =>
    method === "avalanche"
      ? b.apr - a.apr || a.balance - b.balance
      : a.balance - b.balance || b.apr - a.apr
  );

  const balances = order.map((d) => ({ ...d, paidAt: null }));
  const keyframeMonths = new Set([0]);
  const keyframeLabels = { 0: "T·0 BASELINE" };

  const totalDebt0 = active.reduce((s, d) => s + d.balance, 0);
  const liabilities0 = {};
  balances.forEach((d) => { liabilities0[d.id || d.name] = Math.max(0, d.balance); });
  const series = [{
    month: 0,
    date: addMonths(now, 0),
    netWorth: startingCash - totalDebt0,
    debtRemaining: totalDebt0,
    income: recIn,
    expenses: recOut,
    monthlyNet,
    liabilities: liabilities0,
    cashBuffer: startingCash - recOut,
    cashBalance: startingCash,
    keyframe: true,
    keyframeLabel: keyframeLabels[0],
  }];

  let cash = startingCash;
  let cumInterest = 0;
  let debtFreeMonth = null;
  let cashZeroMonth = null;

  for (let m = 1; m <= months; m++) {
    cash += monthlyNet; // net living cash flow

    // accrue interest
    let monthInterest = 0;
    balances.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * d.apr / 100 / 12;
        d.balance += interest;
        monthInterest += interest;
      }
    });
    cumInterest += monthInterest;

    // budget: pay minimums at least; roll surplus forward; never exceed available cash
    const minTotal = balances.reduce((s, d) => s + (d.balance > 0 ? d.min : 0), 0);
    let budget = Math.max(monthlyNet + (extraPayment || 0), minTotal);
    if (budget < 0) budget = 0;
    if (budget > cash) budget = Math.max(0, cash);

    // 1) minimums across all active debts
    balances.forEach((d) => {
      if (d.balance > 0 && budget > 0) {
        const pay = Math.min(d.min, budget, d.balance);
        d.balance -= pay; budget -= pay; cash -= pay;
      }
    });

    // 2) ROLLOVER — leftover budget (incl. freed minimums from $0 debts) applies to next priority debt
    for (let i = 0; i < balances.length && budget > 0; i++) {
      const d = balances[i];
      if (d.balance > 0) {
        const pay = Math.min(budget, d.balance);
        d.balance -= pay; budget -= pay; cash -= pay;
      }
    }

    // keyframes — the very month a liability hits $0, plus full debt-free
    balances.forEach((d) => {
      if (!d.paidAt && d.balance <= 0.005) {
        d.paidAt = m;
        keyframeMonths.add(m);
        keyframeLabels[m] = `${d.name || "Liability"} · $0`;
      }
    });

    const debtRemaining = balances.reduce((s, d) => s + Math.max(0, d.balance), 0);
    // Only flag "DEBT FREE" when there was actual debt to clear — otherwise a
    // user who starts debt-free gets a spurious keyframe and the chart truncates.
    if (totalDebt0 > 0.005 && debtRemaining <= 0.005 && !keyframeMonths.has(m)) {
      keyframeMonths.add(m);
      keyframeLabels[m] = "DEBT FREE";
    }
    if (debtFreeMonth === null && totalDebt0 > 0.005 && debtRemaining <= 0.005) debtFreeMonth = m;
    // Track a cash-balance depletion as a second "series hits 0" event so the
    // graph also ends 2 months after the balance is drained to zero.
    if (cashZeroMonth === null && startingCash > 0.005 && cash <= 0.005) cashZeroMonth = m;

    const libs = {};
    balances.forEach((d) => { libs[d.id || d.name] = Math.max(0, d.balance); });
    series.push({
      month: m,
      date: addMonths(now, m),
      netWorth: cash - debtRemaining,
      debtRemaining,
      cumInterest,
      income: recIn,
      expenses: recOut,
      monthlyNet,
      liabilities: libs,
      cashBuffer: cash - recOut,
      cashBalance: cash,
      keyframe: keyframeMonths.has(m),
      keyframeLabel: keyframeLabels[m] || "",
    });

    // Stop calculating 2 months after the LAST series that hits zero (debt
    // payoff and/or cash depletion) so charts don't flatline for hundreds of
    // months. If no series ever hits zero, the loop runs the full `months` cap
    // (a reasonable fixed range) instead.
    if (stopAfterDebtFree) {
      let stopMonth = -1;
      if (debtFreeMonth !== null) stopMonth = Math.max(stopMonth, debtFreeMonth);
      if (cashZeroMonth !== null) stopMonth = Math.max(stopMonth, cashZeroMonth);
      if (stopMonth >= 0 && m - stopMonth >= 2) break;
    }
  }

  return { series, keyframes: [...keyframeMonths].sort((a, b) => a - b), order };
}

/**
 * Solve for the minimum extra monthly payment that clears all debt on or before
 * `targetMonths`. Returns { extra, reached }.
 */
export function solveExtraForTarget({
  debts = [], accounts = [], transactions = [],
  months = 120, method = "avalanche", targetMonths = 12,
} = {}) {
  const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const cap = Math.max(1000, Math.ceil(totalDebt) + 1000);

  const at = (extra) => {
    const { series } = computeTrajectory({ debts, accounts, transactions, months, method, extraPayment: extra });
    const df = series.find((p) => p.debtRemaining <= 0.005)?.month;
    return df != null && df <= targetMonths;
  };

  if (at(0)) return { extra: 0, reached: true };
  let lo = 1, hi = cap, ans = null;
  while (lo <= hi) {
    const mid = Math.round((lo + hi) / 2);
    if (at(mid)) { ans = mid; hi = mid - 1; }
    else lo = mid + 1;
  }
  return { extra: ans, reached: ans != null };
}

/**
 * Sort active debts by the given strategy. Returns the original debt objects
 * (with all their fields) in payoff-priority order.
 */
export function sortDebts(debts, method = "avalanche") {
  return debts
    .filter((d) => (d.current_balance || 0) > 0.005)
    .sort((a, b) =>
      method === "avalanche"
        ? (b.interest_rate || 0) - (a.interest_rate || 0) || (a.current_balance || 0) - (b.current_balance || 0)
        : (a.current_balance || 0) - (b.current_balance || 0) || (b.interest_rate || 0) - (a.interest_rate || 0)
    );
}

/**
 * Unified flat-surplus simulation — runs computeTrajectory once with a virtual
 * unlimited-cash account so the cash constraint never interferes, then extracts
 * the payoff summary *and* the month-by-month series from a single pass.
 *
 * Replaces the old simulatePayoff + simulateTimeline combo.
 */
export function simulateFlatRun(debts, surplus, method = "avalanche", maxMonths = 360) {
  const order = sortDebts(debts, method);
  const totalDebt = order.reduce((s, d) => s + (d.current_balance || 0), 0);

  if (!order.length || surplus <= 0) {
    return {
      months: 0,
      debtFreeDate: null,
      totalDebt,
      totalInterest: 0,
      order,
      series: [{ month: 0, balance: totalDebt }],
    };
  }

  const { series: traj } = computeTrajectory({
    debts,
    accounts: [{ balance: 1e15 }],
    transactions: [],
    months: maxMonths,
    method,
    extraPayment: surplus,
    stopAfterDebtFree: true,
  });

  const debtFreeMonth = traj.findIndex((p) => p.debtRemaining <= 0.005);
  const totalInterest = debtFreeMonth > 0
    ? traj[debtFreeMonth].cumInterest
    : traj[traj.length - 1]?.cumInterest || 0;
  const flatSeries = traj.map((p) => ({ month: p.month, balance: Math.max(0, p.debtRemaining) }));

  return {
    months: debtFreeMonth > 0 ? debtFreeMonth : 0,
    debtFreeDate: debtFreeMonth > 0 ? traj[debtFreeMonth].date : null,
    totalDebt,
    totalInterest,
    order,
    series: flatSeries,
  };
}

/** Thin wrappers preserving the old debtStrategy.js API shapes. */
export function simulatePayoff(debts, surplus, method = "avalanche") {
  const { months, debtFreeDate, totalDebt, totalInterest, order } = simulateFlatRun(debts, surplus, method);
  return { months, debtFreeDate, totalDebt, totalInterest, order };
}

export function simulateTimeline(debts, surplus, method = "avalanche") {
  const { months, totalInterest, series } = simulateFlatRun(debts, surplus, method);
  return { months, totalInterest, series };
}

export function computeSavings(debts, baseSurplus, extra, method = "avalanche") {
  const base = simulateFlatRun(debts, baseSurplus || 0, method);
  const optimal = simulateFlatRun(debts, (baseSurplus || 0) + (extra || 0), method);
  return {
    baseMonths: base.months,
    baseInterest: base.totalInterest,
    optMonths: optimal.months,
    optInterest: optimal.totalInterest,
    monthsFaster: Math.max(0, base.months - optimal.months),
    interestSaved: Math.max(0, base.totalInterest - optimal.totalInterest),
    baseDate: base.debtFreeDate,
    optDate: optimal.debtFreeDate,
  };
}