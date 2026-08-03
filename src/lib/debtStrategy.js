// Debt payoff strategy math utilities
import { addMonths } from "date-fns";

/**
 * Simulate a debt payoff projection.
 * @param {Array} debts - [{ id, name, current_balance, interest_rate (APR %), minimum_payment }]
 * @param {number} monthlySurplus - total cash available monthly for debt payments
 * @param {"avalanche"|"snowball"} method
 * @returns {{ months, debtFreeDate, totalDebt, order }}
 */
export function simulatePayoff(debts, monthlySurplus, method = "avalanche") {
  const active = debts.filter((d) => (d.current_balance || 0) > 0.005);
  const totalDebt = active.reduce((s, d) => s + (d.current_balance || 0), 0);

  if (!active.length || monthlySurplus <= 0) {
    return { months: 0, debtFreeDate: null, totalDebt, order: [] };
  }

  const order = [...active].sort((a, b) =>
    method === "avalanche"
      ? (b.interest_rate || 0) - (a.interest_rate || 0) || (a.current_balance || 0) - (b.current_balance || 0)
      : (a.current_balance || 0) - (b.current_balance || 0) || (b.interest_rate || 0) - (a.interest_rate || 0)
  );

  const balances = order.map((d) => ({
    name: d.name,
    balance: d.current_balance,
    apr: d.interest_rate || 0,
    min: d.minimum_payment || 0,
  }));

  const minTotal = balances.reduce((s, d) => s + d.min, 0);
  const monthly = Math.max(monthlySurplus, minTotal);

  let months = 0;
  let totalInterest = 0;
  const cap = 600; // 50-year safety cap

  while (balances.some((d) => d.balance > 0.005) && months < cap) {
    months++;
    // Accrue interest
    balances.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * (d.apr / 100 / 12);
        totalInterest += interest;
        d.balance += interest;
      }
    });
    let budget = monthly;
    // Pay minimums across all debts
    balances.forEach((d) => {
      if (d.balance > 0) {
        const pay = Math.min(d.min, d.balance);
        d.balance -= pay;
        budget -= pay;
      }
    });
    // Rollover: leftover budget (incl. any freed minimum from a debt that hit $0) is applied to the next debt in priority order
    for (let i = 0; i < balances.length && budget > 0; i++) {
      if (balances[i].balance > 0) {
        const pay = Math.min(budget, balances[i].balance);
        balances[i].balance -= pay;
        budget -= pay;
      }
    }
  }

  return {
    months,
    debtFreeDate: addMonths(new Date(), months),
    totalDebt,
    totalInterest,
    order,
  };
}

/**
 * Compare the current payoff path vs an optimized path that adds an extra monthly boost.
 * Returns months faster and interest saved.
 */
export function computeSavings(debts, baseSurplus, extra, method = "avalanche") {
  const base = simulatePayoff(debts, baseSurplus || 0, method);
  const optimal = simulatePayoff(debts, (baseSurplus || 0) + (extra || 0), method);
  return {
    baseMonths: base.months,
    baseInterest: base.totalInterest || 0,
    optMonths: optimal.months,
    optInterest: optimal.totalInterest || 0,
    monthsFaster: Math.max(0, base.months - optimal.months),
    interestSaved: Math.max(0, (base.totalInterest || 0) - (optimal.totalInterest || 0)),
    baseDate: base.debtFreeDate,
    optDate: optimal.debtFreeDate,
  };
}

/**
 * Break a minimum payment into interest vs principal portions.
 */
export function interestBreakdown(debt) {
  const balance = debt.current_balance || 0;
  const apr = debt.interest_rate || 0;
  const min = debt.minimum_payment || 0;
  const interest = balance * (apr / 100 / 12);
  const principal = Math.max(0, min - interest);
  return { interest, principal, min };
}

/**
 * Simulate the month-by-month total balance trajectory to zero.
 * Returns { months, totalInterest, series: [{ month, balance }] }.
 */
export function simulateTimeline(debts, monthlySurplus, method = "avalanche") {
  const active = debts.filter((d) => (d.current_balance || 0) > 0.005);
  const totalDebt = active.reduce((s, d) => s + (d.current_balance || 0), 0);

  if (!active.length || monthlySurplus <= 0) {
    return { months: 0, totalInterest: 0, series: [{ month: 0, balance: totalDebt }] };
  }

  const order = [...active].sort((a, b) =>
    method === "avalanche"
      ? (b.interest_rate || 0) - (a.interest_rate || 0) || (a.current_balance || 0) - (b.current_balance || 0)
      : (a.current_balance || 0) - (b.current_balance || 0) || (b.interest_rate || 0) - (a.interest_rate || 0)
  );

  const balances = order.map((d) => ({
    name: d.name,
    balance: d.current_balance,
    apr: d.interest_rate || 0,
    min: d.minimum_payment || 0,
  }));

  const minTotal = balances.reduce((s, d) => s + d.min, 0);
  const monthly = Math.max(monthlySurplus, minTotal);

  let months = 0;
  let totalInterest = 0;
  const series = [{ month: 0, balance: totalDebt }];
  const cap = 600;

  while (balances.some((d) => d.balance > 0.005) && months < cap) {
    months++;
    balances.forEach((d) => {
      if (d.balance > 0) {
        const interest = d.balance * (d.apr / 100 / 12);
        totalInterest += interest;
        d.balance += interest;
      }
    });
    let budget = monthly;
    balances.forEach((d) => {
      if (d.balance > 0) {
        const pay = Math.min(d.min, d.balance);
        d.balance -= pay;
        budget -= pay;
      }
    });
    for (let i = 0; i < balances.length && budget > 0; i++) {
      if (balances[i].balance > 0) {
        const pay = Math.min(budget, balances[i].balance);
        balances[i].balance -= pay;
        budget -= pay;
      }
    }
    const total = balances.reduce((s, d) => s + Math.max(0, d.balance), 0);
    series.push({ month: months, balance: total });
  }

  return { months, totalInterest, series };
}