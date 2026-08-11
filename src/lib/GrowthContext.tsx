import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useSI } from "@/lib/SIContext";

interface GrowthState {
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  unlockedThemes: string[];
}

const GrowthCtx = createContext<GrowthState | null>(null);

const LEVEL_THEMES: Record<number, string[]> = {
  1: [],
  2: ["daylight"],
  3: ["forest"],
  5: ["sunset"],
  7: ["cottonCandy"],
  10: ["wealthsimple"],
};

const MILESTONES = [7, 14, 30, 60, 90, 180, 365];

/**
 * Calculate XP for a single check-in:
 *   base = 10 * difficulty (1-5 → 10-50 XP)
 *   streak milestones award bonus XP
 */
function xpForCheckIn(difficulty: number): number {
  return Math.floor(10 * Math.max(difficulty, 1));
}

function streakBonus(streak: number): number {
  let bonus = 0;
  for (const ms of MILESTONES) {
    if (streak >= ms) bonus += 5;
  }
  return bonus;
}

/**
 * Calculate total XP from entries + habits.
 * Each check-in = 10 × difficulty XP.
 * Streak bonuses: +5 XP per milestone reached (7/14/30/60/90/180/365).
 */
function calculateTotalXp(
  habits: any[],
  entries: any[],
  getStreak: (id: string) => number
): number {
  let xp = 0;

  for (const h of habits) {
    if (!h.id) continue;
    const habitEntries = entries.filter((e) => e.focus_id === h.id);
    const diff = h.difficulty ?? 3;

    // Base XP for each check-in
    xp += habitEntries.length * xpForCheckIn(diff);

    // Streak bonus
    const streak = getStreak(h.id);
    xp += streakBonus(streak);
  }

  return xp;
}

export function GrowthProvider({ children }: { children: React.ReactNode }) {
  const { habits, entries, getStreak } = useSI();

  const { totalXp, level, xpInLevel, xpForNext } = useMemo(() => {
    const total = calculateTotalXp(habits, entries, getStreak);
    return levelFromXp(total);
  }, [habits, entries, getStreak]);

  const unlockedThemes = useMemo(() => {
    const themes: string[] = [];
    for (const [lvl, themeList] of Object.entries(LEVEL_THEMES)) {
      if (level >= parseInt(lvl)) themes.push(...themeList);
    }
    return themes;
  }, [level]);

  return (
    <GrowthCtx.Provider value={{ totalXp, level, xpInLevel, xpForNext, unlockedThemes }}>
      {children}
    </GrowthCtx.Provider>
  );
}

export function useGrowth() {
  const ctx = useContext(GrowthCtx);
  if (!ctx) throw new Error("useGrowth must be used within GrowthProvider");
  return ctx;
}

/**
 * Level calculation:
 * Level 1: 0-99 XP
 * Level 2: 100-299 XP
 * Level n: requires n * 100 XP from previous level
 */
function levelFromXp(totalXp: number): { level: number; xpInLevel: number; xpForNext: number } {
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