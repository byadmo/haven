/**
 * debtStrategy.js — now a thin re-export layer.
 *
 * The actual simulation engine lives in trajectory.js (computeTrajectory).
 * All payoff/projection functions delegate to the unified engine there,
 * eliminating the duplicated month-by-month simulation that used to exist
 * in this file.
 *
 * Only interestBreakdown remains defined here (it's a simple per-payment
 * utility, not a full simulation).
 *
 * Consumers can import from either module — the API is identical.
 */
export {
  simulatePayoff,
  simulateTimeline,
  computeSavings,
  sortDebts,
  computeTrajectory,
  solveExtraForTarget,
  simulateFlatRun,
} from "@/lib/trajectory";

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