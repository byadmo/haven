import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";

const SIContext = createContext(null);

const todayKey = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = "haven_si_data";

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function SIProvider({ children }) {
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load from backend or localStorage
  const load = useCallback(async () => {
    // Try backend first
    try {
      const [h, e, r] = await Promise.all([
        base44.entities.Focus.list("-created_date", 500).catch(() => []),
        base44.entities.StudySession.list("-created_date", 500).catch(() => []),
        base44.entities.NetWorthSnapshot.list("-created_date", 500).catch(() => []),
      ]);
      // Focus entity = habits, StudySession = habit check-ins, NetWorthSnapshot repurposed for reflections
      // Fallback: use localStorage if backend returns empty
      if (h.length || e.length || r.length) {
        setHabits(h);
        setEntries(e);
        setReflections(r);
      } else {
        const local = loadLocal();
        if (local) {
          setHabits(local.habits || []);
          setEntries(local.entries || []);
          setReflections(local.reflections || []);
        }
      }
    } catch {
      const local = loadLocal();
      if (local) {
        setHabits(local.habits || []);
        setEntries(local.entries || []);
        setReflections(local.reflections || []);
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Persist to localStorage on every change
  useEffect(() => {
    if (loaded) saveLocal({ habits, entries, reflections });
  }, [habits, entries, reflections, loaded]);

  // ── Habits ──
  const addHabit = useCallback(async (habit) => {
    const newHabit = {
      name: habit.name,
      icon: habit.icon || "CheckCircle",
      color: habit.color || "amber",
      target_frequency: habit.frequency || "daily",
      created_date: new Date().toISOString(),
      ...habit,
    };
    try {
      const saved = await base44.entities.Focus.create(newHabit);
      setHabits(prev => [saved, ...prev]);
      return saved;
    } catch {
      const local = { id: crypto.randomUUID?.() || String(Date.now()), ...newHabit };
      setHabits(prev => [local, ...prev]);
      return local;
    }
  }, []);

  const toggleHabit = useCallback(async (habitId, date = todayKey()) => {
    // Check if entry exists for this habit + date
    const existing = entries.find(e => e.focus_id === habitId && e.date === date);
    if (existing) {
      // Remove (uncheck)
      try { await base44.entities.StudySession.delete(existing.id); } catch {}
      setEntries(prev => prev.filter(e => e.id !== existing.id));
    } else {
      // Add (check)
      const entry = { focus_id: habitId, date, completed: true, created_date: new Date().toISOString() };
      try {
        const saved = await base44.entities.StudySession.create(entry);
        setEntries(prev => [saved, ...prev]);
      } catch {
        const local = { id: crypto.randomUUID?.() || String(Date.now()), ...entry };
        setEntries(prev => [local, ...prev]);
      }
    }
  }, [entries]);

  const deleteHabit = useCallback(async (id) => {
    try { await base44.entities.Focus.delete(id); } catch {}
    setHabits(prev => prev.filter(h => h.id !== id));
    setEntries(prev => prev.filter(e => e.focus_id !== id));
  }, []);

  // ── Reflections ──
  const addReflection = useCallback(async (reflection) => {
    const entry = {
      ...reflection,
      type: "reflection",
      created_date: new Date().toISOString(),
    };
    try {
      const saved = await base44.entities.NetWorthSnapshot.create(entry);
      setReflections(prev => [saved, ...prev]);
      return saved;
    } catch {
      const local = { id: crypto.randomUUID?.() || String(Date.now()), ...entry };
      setReflections(prev => [local, ...prev]);
      return local;
    }
  }, []);

  const deleteReflection = useCallback(async (id) => {
    try { await base44.entities.NetWorthSnapshot.delete(id); } catch {}
    setReflections(prev => prev.filter(r => r.id !== id));
  }, []);

  // ── Computed ──
  const getStreak = useCallback((habitId) => {
    const habitEntries = entries
      .filter(e => e.focus_id === habitId)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (habitEntries.length === 0) return 0;
    let streak = 0;
    let cursor = new Date();
    for (let i = 0; i < 365; i++) {
      const dKey = cursor.toISOString().slice(0, 10);
      if (habitEntries.some(e => e.date === dKey)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (i === 0) {
        // Today not done yet — don't break streak, just skip
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [entries]);

  const getTodayStatus = useCallback((habitId) => {
    return entries.some(e => e.focus_id === habitId && e.date === todayKey());
  }, [entries]);

  return (
    <SIContext.Provider value={{
      habits, entries, reflections, loaded,
      addHabit, toggleHabit, deleteHabit,
      addReflection, deleteReflection,
      getStreak, getTodayStatus,
      refresh: load,
    }}>
      {children}
    </SIContext.Provider>
  );
}

export function useSI() {
  const ctx = useContext(SIContext);
  if (!ctx) throw new Error("useSI must be used within SIProvider");
  return ctx;
}
