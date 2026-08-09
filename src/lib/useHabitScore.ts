import { useMemo } from "react";

/**
 * Habit Strength Score — probabilistic exponential decay model.
 *
 * Corrected formula:  P(t) = (1 - exp(-alpha * R / D)) * exp(-beta * M)
 *
 *   P(t)    → Habit Strength Score (0.0–1.0)
 *   R(t)    → Cumulative successful repetitions
 *   D       → Difficulty coefficient (1 = easy, 5 = hard)
 *   alpha   → Reward multiplier (default 2.0)
 *   M(t)    → Cumulative missed days
 *   beta    → Decay parameter for misses (default 0.5)
 *
 * When M is large → exp(-beta*M) → 0 → score → 0 (misses punish).
 * When R is large → exp(-alpha*R/D) → 0 → (1-0) → 1 → score capped by misses.
 */

interface HabitScoreInput {
  habit: {
    difficulty?: number;
    cumulative_repetitions?: number;
    misses?: number;
  };
  alpha?: number;
  beta?: number;
}

/**
 * Calculate the Habit Strength Score for a single habit.
 */
export function calculateHabitScore(input: HabitScoreInput): number {
  const { habit, alpha = 2.0, beta = 0.5 } = input;
  const D = Math.max(habit.difficulty ?? 3, 1);
  const R = Math.max(habit.cumulative_repetitions ?? 0, 0);
  const M = Math.max(habit.misses ?? 0, 0);

  // Reward term: approaches 1 as repetitions increase (diminishing returns)
  const rewardTerm = 1 - Math.exp((-alpha * R) / D);

  // Decay term: approaches 0 as misses increase
  const decayTerm = Math.exp(-beta * M);

  const score = rewardTerm * decayTerm;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Determine the XP awarded for a single habit check-in.
 * XP = floor(10 * P(t) * D) — higher difficulty + higher score = more XP.
 */
export function xpForCheckIn(score: number, difficulty: number): number {
  return Math.floor(10 * score * Math.max(difficulty, 1));
}

/**
 * Determine the level from total XP.
 * Each level costs: level * 100 XP (level 1 = 100, level 2 = 200, etc.)
 */
export function levelFromXp(totalXp: number): { level: number; xpInLevel: number; xpForNext: number } {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= 0) {
    const cost = level * 100;
    if (remaining < cost) {
      return { level, xpInLevel: remaining, xpForNext: cost };
    }
    remaining -= cost;
    level++;
  }
  return { level: 1, xpInLevel: 0, xpForNext: 100 };
}

/**
 * React hook version — recalculates when inputs change.
 */
export function useHabitScore(habit: HabitScoreInput["habit"], alpha = 2.0, beta = 0.5): number {
  return useMemo(
    () => calculateHabitScore({ habit, alpha, beta }),
    [habit?.difficulty, habit?.cumulative_repetitions, habit?.misses, alpha, beta]
  );
}

/**
 * Weekday vs Weekend completion rate calculator.
 * Returns { weekdayRate, weekendRate, overall } as ratios (0–1).
 */
export function weekdayWeekendRates(entries: { date: string; completed?: boolean }[]) {
  let weekDays = 0, weekDone = 0;
  let weekEnds = 0, weekEndDone = 0;

  for (const e of entries) {
    if (!e.date) continue;
    const d = new Date(e.date + "T00:00:00");
    if (isNaN(d.getTime())) continue;
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    if (isWeekend) { weekEnds++; if (e.completed !== false) weekEndDone++; }
    else { weekDays++; if (e.completed !== false) weekDone++; }
  }

  return {
    weekdayRate: weekDays > 0 ? weekDone / weekDays : 0,
    weekendRate: weekEnds > 0 ? weekEndDone / weekEnds : 0,
    overall: weekDays + weekEnds > 0 ? (weekDone + weekEndDone) / (weekDays + weekEnds) : 0,
  };
}