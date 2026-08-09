import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useSI } from "@/lib/SIContext";
import { calculateHabitScore, levelFromXp, xpForCheckIn } from "@/lib/useHabitScore";

interface GrowthState {
  totalXp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  unlockedThemes: string[];
}

const GrowthCtx = createContext<GrowthState | null>(null);

const GROWTH_STORAGE_KEY = "haven_growth_xp";

const LEVEL_THEMES: Record<number, string[]> = {
  1: [],
  2: ["daylight"],
  3: ["forest"],
  5: ["sunset"],
  7: ["cottonCandy"],
  10: ["wealthsimple"],
};

function loadXp(): number {
  try { return parseInt(localStorage.getItem(GROWTH_STORAGE_KEY) || "0", 10); }
  catch { return 0; }
}

function saveXp(xp: number) {
  try { localStorage.setItem(GROWTH_STORAGE_KEY, String(xp)); } catch {}
}

export function GrowthProvider({ children }: { children: React.ReactNode }) {
  const { habits, entries } = useSI();
  const [totalXp, setTotalXp] = useState(loadXp);

  // Persist XP changes
  useEffect(() => { saveXp(totalXp); }, [totalXp]);

  // Award XP when habit entries change
  useEffect(() => {
    let newXp = 0;
    for (const h of habits) {
      if (!h.id) continue;
      const score = calculateHabitScore({
        habit: { difficulty: h.difficulty, cumulative_repetitions: h.cumulative_repetitions ?? 0, misses: h.misses ?? 0 },
      });
      // Count check-ins for this habit
      const checkIns = entries.filter((e) => e.focus_id === h.id).length;
      // Previous XP was based on previous check-in count
      // We award XP based on current state
      if (score > 0.8) {
        newXp += xpForCheckIn(score, h.difficulty ?? 3) * checkIns;
      } else if (score > 0.5) {
        newXp += Math.floor(xpForCheckIn(score, h.difficulty ?? 3) * 0.5) * checkIns;
      }
    }
    // Only update if significantly different (avoid infinite loops)
    setTotalXp((prev) => Math.max(prev, newXp));
  }, [habits, entries]);

  const { level, xpInLevel, xpForNext } = useMemo(() => levelFromXp(totalXp), [totalXp]);

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