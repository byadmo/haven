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
  months = 60, method = "avalanche", extraPayment = 0,
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
  const monthlyNet = recIn - recOut;

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
    liabilities: liabilities0,
    cashBuffer: startingCash - recOut,
    cashBalance: startingCash,
    keyframe: true,
    keyframeLabel: keyframeLabels[0],
  }];

  let cash = startingCash;

  for (let m = 1; m <= months; m++) {
    cash += monthlyNet; // net living cash flow

    // accrue interest
    balances.forEach((d) => {
      if (d.balance > 0) d.balance *= 1 + d.apr / 100 / 12;
    });

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
    if (debtRemaining <= 0.005 && !keyframeMonths.has(m)) {
      keyframeMonths.add(m);
      keyframeLabels[m] = "DEBT FREE";
    }

    const libs = {};
    balances.forEach((d) => { libs[d.id || d.name] = Math.max(0, d.balance); });
    series.push({
      month: m,
      date: addMonths(now, m),
      netWorth: cash - debtRemaining,
      debtRemaining,
      income: recIn,
      liabilities: libs,
      cashBuffer: cash - recOut,
      cashBalance: cash,
      keyframe: keyframeMonths.has(m),
      keyframeLabel: keyframeLabels[m] || "",
    });
  }

  return { series, keyframes: [...keyframeMonths].sort((a, b) => a - b), order };
}