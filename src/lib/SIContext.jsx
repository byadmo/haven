import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { applyTheme, DEFAULT_THEME, setStoredTheme, getStoredTheme } from "@/lib/themes";
import { getUiScale, setUiScale } from "@/lib/uiScale";

const SIContext = createContext(null);

const todayKey = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = "haven_si_data";
const SETTINGS_KEY = "haven_growth_settings";

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

function loadSettingsLocal() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveSettingsLocal(data) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(data)); } catch {}
}

const DEFAULT_SETTINGS = {
  has_completed_splash: false,
  has_completed_setup: false,
  display_name: "",
  primary_focus_goal: "",
  theme: DEFAULT_THEME,
  ui_scale: 100,
  google_calendar_connected: false,
  calendar_email: "",
  daily_reminder_time: "",
  week_starts_on: "monday",
  nav_items: null,
};

export function SIProvider({ children }) {
  const [habits, setHabits] = useState([]);
  const [entries, setEntries] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [settings, setSettings] = useState(() => {
    const local = loadSettingsLocal();
    return { ...DEFAULT_SETTINGS, ...local };
  });
  const [loaded, setLoaded] = useState(false);

  // Load from backend or localStorage
  const load = useCallback(async () => {
    // Try backend for habits/entries/reflections
    try {
      const [h, e, r] = await Promise.all([
        base44.entities.Focus.list("-created_date", 500).catch(() => []),
        base44.entities.StudySession.list("-created_date", 500).catch(() => []),
        base44.entities.NetWorthSnapshot.list("-created_date", 500).catch(() => []),
      ]);
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

    // Try backend for settings
    try {
      const existing = await base44.entities.GrowthSettings.list("-created_date", 1);
      if (existing && existing.length > 0) {
        const s = existing[0];
        setSettings(prev => ({ ...prev, ...s }));
        // Apply theme + ui scale globally
        if (s.theme) {
          applyTheme(document.documentElement, s.theme);
          setStoredTheme("growth", s.theme);
        }
        if (s.ui_scale) {
          setUiScale(s.ui_scale / 100);
        }
      }
    } catch {
      // Use localStorage settings (already in state)
    }

    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Persist habits/entries/reflections to localStorage
  useEffect(() => {
    if (loaded) saveLocal({ habits, entries, reflections });
  }, [habits, entries, reflections, loaded]);

  // Persist settings to localStorage
  useEffect(() => {
    if (loaded) saveSettingsLocal(settings);
  }, [settings, loaded]);

  // ── Settings ──
  const updateSettings = useCallback(async (patch) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);

    // Apply theme globally
    if (patch.theme) {
      applyTheme(document.documentElement, patch.theme);
      setStoredTheme("growth", patch.theme);
    }
    // Apply UI scale globally
    if (patch.ui_scale !== undefined) {
      setUiScale(patch.ui_scale / 100);
    }

    // Persist to backend
    try {
      if (settings.id) {
        await base44.entities.GrowthSettings.update(settings.id, patch);
      } else {
        const saved = await base44.entities.GrowthSettings.create(updated);
        setSettings(prev => ({ ...prev, ...saved }));
      }
    } catch {}
  }, [settings]);

  const resetGrowthData = useCallback(async () => {
    // Delete all habits, entries, reflections
    try {
      await Promise.all([
        base44.entities.Focus.deleteMany({}).catch(() => {}),
        base44.entities.StudySession.deleteMany({}).catch(() => {}),
      ]);
      // Delete reflections (stored as NetWorthSnapshot with type=reflection)
      const allSnaps = await base44.entities.NetWorthSnapshot.list("-created_date", 500).catch(() => []);
      await Promise.all(
        allSnaps
          .filter(s => s.type === "reflection")
          .map(s => base44.entities.NetWorthSnapshot.delete(s.id).catch(() => {}))
      );
    } catch {}

    // Reset local state
    setHabits([]);
    setEntries([]);
    setReflections([]);

    // Clear localStorage
    try { localStorage.removeItem(STORAGE_KEY); } catch {}

    // Reset onboarding flags
    await updateSettings({
      has_completed_splash: false,
      has_completed_setup: false,
    });
  }, [updateSettings]);

  // ── Habits ──
    const addHabit = useCallback(async (habit) => {
      const newHabit = {
        name: habit.name,
        icon: habit.icon || "CheckCircle",
        color: habit.color || "amber",
        difficulty: habit.difficulty ?? 3,
        target_frequency: habit.frequency || "daily",
        cumulative_repetitions: 0,
        misses: 0,
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
    const existing = entries.find(e => e.focus_id === habitId && e.date === date);
    if (existing) {
      try { await base44.entities.StudySession.delete(existing.id); } catch {}
      setEntries(prev => prev.filter(e => e.id !== existing.id));
    } else {
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
      habits, entries, reflections, settings, loaded,
      addHabit, toggleHabit, deleteHabit,
      addReflection, deleteReflection,
      getStreak, getTodayStatus,
      updateSettings, resetGrowthData,
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
