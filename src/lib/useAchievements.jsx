import React, { useMemo } from "react";
import { useGrowth } from "@/lib/GrowthContext";
import { useSI } from "@/lib/SIContext";

// Achievement definitions
const ACHIEVEMENTS = [
  { id: "first_habit", label: "First Habit", desc: "Create your first habit", icon: "🎯", check: (h) => h.habits.length >= 1 },
  { id: "first_checkin", label: "First Check-in", desc: "Complete your first habit check-in", icon: "✅", check: (h) => h.entries.length >= 1 },
  { id: "first_reflection", label: "First Reflection", desc: "Write your first journal entry", icon: "📝", check: (h) => h.reflections.length >= 1 },
  { id: "streak_7", label: "7-Day Streak", desc: "Maintain a 7-day streak on any habit", icon: "🔥", check: (h) => h.bestStreak >= 7 },
  { id: "streak_14", label: "14-Day Streak", desc: "Maintain a 14-day streak", icon: "🔥", check: (h) => h.bestStreak >= 14 },
  { id: "streak_30", label: "30-Day Streak", desc: "Maintain a 30-day streak", icon: "🏆", check: (h) => h.bestStreak >= 30 },
  { id: "streak_60", label: "60-Day Streak", desc: "Maintain a 60-day streak", icon: "💎", check: (h) => h.bestStreak >= 60 },
  { id: "streak_90", label: "90-Day Streak", desc: "Maintain a 90-day streak", icon: "👑", check: (h) => h.bestStreak >= 90 },
  { id: "checkins_10", label: "10 Check-ins", desc: "Complete 10 total habit check-ins", icon: "📊", check: (h) => h.entries.length >= 10 },
  { id: "checkins_50", label: "50 Check-ins", desc: "Complete 50 total habit check-ins", icon: "📊", check: (h) => h.entries.length >= 50 },
  { id: "checkins_100", label: "100 Check-ins", desc: "Complete 100 total habit check-ins", icon: "💯", check: (h) => h.entries.length >= 100 },
  { id: "reflections_5", label: "5 Reflections", desc: "Write 5 journal entries", icon: "📓", check: (h) => h.reflections.length >= 5 },
  { id: "reflections_25", label: "25 Reflections", desc: "Write 25 journal entries", icon: "📚", check: (h) => h.reflections.length >= 25 },
  { id: "level_2", label: "Level 2", desc: "Reach Level 2", icon: "⭐", check: (h) => h.level >= 2 },
  { id: "level_5", label: "Level 5", desc: "Reach Level 5", icon: "🌟", check: (h) => h.level >= 5 },
  { id: "level_10", label: "Level 10", desc: "Reach Level 10", icon: "🌠", check: (h) => h.level >= 10 },
  { id: "five_habits", label: "Five Habits", desc: "Create 5 habits", icon: "🎯", check: (h) => h.habits.length >= 5 },
  { id: "full_week", label: "Full Week", desc: "Complete all habits for 7 consecutive days", icon: "📅", check: (h) => h.entries.length >= 7 * h.habits.length },
  { id: "journal_streak_3", label: "Journal Streak 3", desc: "Write journal entries 3 days in a row", icon: "✍️", check: (h) => h.journalStreak >= 3 },
  { id: "journal_streak_7", label: "Journal Streak 7", desc: "Write journal entries 7 days in a row", icon: "✍️", check: (h) => h.journalStreak >= 7 },
];

export function useAchievements() {
  const { habits, entries, reflections } = useSI();
  const { level, totalXp } = useGrowth();

  return useMemo(() => {
    const bestStreak = habits.reduce((max, h) => {
      // Simple streak calculation from entries
      const habitEntries = entries.filter(e => e.focus_id === h.id).sort((a, b) => b.date.localeCompare(a.date));
      if (habitEntries.length === 0) return max;
      let streak = 0;
      let cursor = new Date();
      for (let i = 0; i < 365; i++) {
        const key = cursor.toISOString().slice(0, 10);
        if (habitEntries.some(e => e.date === key)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else if (i === 0) {
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      return Math.max(max, streak);
    }, 0);

    // Journal streak
    const dates = [...new Set(reflections.map(r => {
      const d = new Date(r.date || r.created_date);
      return d.toISOString().slice(0, 10);
    }))].sort().reverse();
    let journalStreak = 0;
    if (dates.length > 0) {
      let cursor = new Date();
      for (let i = 0; i < 365; i++) {
        const key = cursor.toISOString().slice(0, 10);
        if (dates.includes(key)) {
          journalStreak++;
          cursor.setDate(cursor.getDate() - 1);
        } else if (i === 0) {
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
    }

    const ctx = { habits, entries, reflections, level, totalXp, bestStreak, journalStreak };

    return ACHIEVEMENTS.map(a => ({
      ...a,
      earned: a.check(ctx),
    }));
  }, [habits, entries, reflections, level, totalXp]);
}