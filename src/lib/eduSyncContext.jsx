import React from "react";
import { Outlet, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { LayoutDashboard, Timer, BookOpen, ShieldCheck, ArrowLeft, Settings } from "lucide-react";
import { percentToGpa } from "@/lib/eduGrading";
import EducationSplash from "@/components/edu/EducationSplash";
import { useToast } from "@/components/ui/use-toast";
import ProfileWizard from "@/components/edu/ProfileWizard";
import { isProfileAddressed, markProfileSkipped } from "@/lib/eduProfile";
import ThemeRoot from "@/components/ThemeRoot";
import { DEFAULT_THEME } from "@/lib/themes";

// Workspace-registered per-user Google Calendar connector (app-user mode).
export const GCALENDAR_CONNECTOR_ID = "6a70ef7e9f47c094588c220b";

export const EDU_NAV = [
  { to: "/education", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/education/focus", label: "Focus Hub", icon: Timer },
  { to: "/education/vault", label: "Vault", icon: BookOpen },
  { to: "/education/settings", label: "Settings", icon: Settings },
];

const EduSyncContext = React.createContext(null);

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

// Auto-detect current term from today's date.
export function detectTerm(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  let term_type, start, end, label;
  if (m >= 8) {
    term_type = "fall"; start = new Date(y, 8, 1); end = new Date(y, 11, 31); label = `Fall ${y}`;
  } else if (m <= 3) {
    term_type = "winter"; start = new Date(y, 0, 1); end = new Date(y, 3, 30); label = `Winter ${y}`;
  } else {
    term_type = "spring_summer"; start = new Date(y, 4, 1); end = new Date(y, 7, 31); label = `Spring/Summer ${y}`;
  }
  return { term_type, term_label: label, year: y, start_date: dayKey(start), end_date: dayKey(end) };
}

function computeStreak(sessions) {
  const set = new Set((sessions || []).map((s) => s.completed_at?.slice(0, 10)).filter(Boolean));
  if (!set.size) return { current: 0, longest: 0 };
  let current = 0;
  let d = new Date();
  if (!set.has(dayKey(d))) {
    d = new Date(); d.setDate(d.getDate() - 1);
    if (!set.has(dayKey(d))) current = 0;
  }
  if (current === 0 && set.has(dayKey(d))) {
    while (set.has(dayKey(d))) { current++; d.setDate(d.getDate() - 1); }
  }
  const sorted = [...set].sort();
  let longest = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]); prev.setDate(prev.getDate() + 1);
    run = dayKey(prev) === sorted[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return { current, longest: Math.max(longest, current) };
}

export function EduSyncProvider({ children }) {
  const [data, setData] = React.useState({
    semesters: [], courses: [], deliverables: [], materials: [], studySessions: [], focuses: [], settings: null,
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  // Ephemeral, client-only set of course IDs currently being enriched by a
  // background AI research task (the user saved mid-research). Resolves when
  // the detached runResearch promise lands + writeBack happens, or resets to
  // empty on reload (course just keeps whatever AI fields were saved then).
  const [aiResearchingIds, _setAiResearching] = React.useState(() => new Set());
  const setAiResearching = React.useCallback((id, isResearching) => {
    _setAiResearching((prev) => {
      const next = new Set(prev);
      if (isResearching) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const refresh = React.useCallback(() => setRefreshKey((k) => k + 1), []);
  const { toast } = useToast();

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.entities.Semester.list("-created_date", 50).catch(() => []),
      base44.entities.Course.list("-created_date", 200).catch(() => []),
      base44.entities.Deliverable.list("-due_date", 500).catch(() => []),
      base44.entities.Material.list("-created_date", 500).catch(() => []),
      base44.entities.StudySession.list("-completed_at", 1000).catch(() => []),
      base44.entities.Focus.list("-target_date", 500).catch(() => []),
      base44.entities.EduSettings.list("-created_date", 1).catch(() => []),
    ]).then(([semesters, courses, deliverables, materials, studySessions, focuses, settingsRows]) => {
      if (cancelled) return;
      setData({ semesters, courses, deliverables, materials, studySessions, focuses: focuses || [], settings: settingsRows?.[0] || null });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const activeSemester = React.useMemo(() => {
    return data.semesters.find((s) => s.is_active) || data.semesters[0] || null;
  }, [data.semesters]);

  const semesterId = activeSemester?.id;
  const courses = React.useMemo(() => data.courses.filter((c) => c.semester_id === semesterId), [data.courses, semesterId]);
  const courseIds = React.useMemo(() => new Set(courses.map((c) => c.id)), [courses]);

  const deliverables = React.useMemo(() => data.deliverables.filter((d) => courseIds.has(d.course_id)), [data.deliverables, courseIds]);
  const materials = React.useMemo(() => data.materials.filter((m) => courseIds.has(m.course_id)), [data.materials, courseIds]);

  const deliverablesByCourse = React.useMemo(() => {
    const map = {};
    deliverables.forEach((d) => { (map[d.course_id] = map[d.course_id] || []).push(d); });
    return map;
  }, [deliverables]);
  const materialsByCourse = React.useMemo(() => {
    const map = {};
    materials.forEach((m) => { (map[m.course_id] = map[m.course_id] || []).push(m); });
    return map;
  }, [materials]);

  const focuses = React.useMemo(() => (data.focuses || []).filter((f) => !f.course_id || courseIds.has(f.course_id)), [data.focuses, courseIds]);
  const focusesByCourse = React.useMemo(() => {
    const map = {};
    focuses.forEach((f) => { (map[f.course_id] = map[f.course_id] || []).push(f); });
    return map;
  }, [focuses]);

  const streak = React.useMemo(() => computeStreak(data.studySessions), [data.studySessions]);

  // Per-course derived: next deliverable + progress + hours studied
  const coursesRich = React.useMemo(() => {
    const today = dayKey(new Date());
    return courses.map((c) => {
      const dlvs = (deliverablesByCourse[c.id] || []).slice().sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
      const upcoming = dlvs.filter((d) => !d.completed && (d.due_date || "") >= today);
      const next = upcoming[0] || null;
      const completedCount = dlvs.filter((d) => d.completed).length;
      const sessions = data.studySessions.filter((s) => s.course_id === c.id);
      const minutes = sessions.reduce((s, x) => s + (x.duration_minutes || 0), 0);
      return { ...c, deliverables: dlvs, next, progress: dlvs.length ? Math.round((completedCount / dlvs.length) * 100) : 0, completedCount, totalCount: dlvs.length, studiedMinutes: minutes, studiedHours: +(minutes / 60).toFixed(1) };
    });
  }, [courses, deliverablesByCourse, data.studySessions]);

  // Weekly study minutes (last 7 days)
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const weeklyMinutes = React.useMemo(() => data.studySessions.filter((s) => new Date(s.completed_at) >= weekStart).reduce((sum, s) => sum + (s.duration_minutes || 0), 0), [data.studySessions, weekStart]);

  // Hours by hour-of-day (peak energy) — minutes per hour bucket
  const hourlyBuckets = React.useMemo(() => {
    const buckets = new Array(24).fill(0);
    data.studySessions.forEach((s) => {
      const h = new Date(s.completed_at).getHours();
      buckets[h] += s.duration_minutes || 0;
    });
    return buckets;
  }, [data.studySessions]);

  // GPA for the current semester only (derived from graded deliverables).
  const semesterGpa = React.useMemo(() => {
    const gpas = [];
    courses.forEach((c) => {
      const dlvs = deliverablesByCourse[c.id] || [];
      const graded = dlvs.filter((d) => d.graded && d.grade != null && d.weight > 0);
      if (graded.length) {
        const totalW = graded.reduce((s, d) => s + d.weight, 0);
        const earned = graded.reduce((s, d) => s + (d.grade / (d.max_grade || 100)) * 100 * d.weight, 0);
        const pct = totalW > 0 ? earned / totalW : null;
        if (pct != null) gpas.push(percentToGpa(pct));
      }
    });
    return gpas.length ? +(gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : null;
  }, [courses, deliverablesByCourse]);

  // Authoritative cumulative GPA comes from the saved transcript (all past
  // terms); falls back to the current-semester GPA when no transcript exists.
  // This is the SINGLE value surfaced app-wide (Dashboard, Analytics, Grades,
  // GPA Projection, Course Load Advisor, Settings) so transcript data
  // propagates everywhere instead of being trapped on the Grades page.
  const transcript = data.settings?.transcript || null;
  const cumulativeGpa = transcript?.cumulativeGpa != null ? transcript.cumulativeGpa : semesterGpa;

  // ---- Mutations (all refresh after) ----
  async function setActiveSemester(id) {
    const others = data.semesters.filter((s) => s.is_active && s.id !== id);
    await Promise.all(others.map((s) => base44.entities.Semester.update(s.id, { is_active: false })).concat(base44.entities.Semester.update(id, { is_active: true })));
    refresh();
  }

  async function createSemester(payload) {
    const created = await base44.entities.Semester.create({ ...payload, is_active: true });
    // deactivate others
    const others = data.semesters.filter((s) => s.id !== created.id && s.is_active);
    await Promise.all(others.map((s) => base44.entities.Semester.update(s.id, { is_active: false }))).catch(() => {});
    refresh();
    return created;
  }

  async function createCourse({ course, deliverables: dlvs = [], materials: mats = [] }) {
    const created = await base44.entities.Course.create(course);
    if (dlvs.length) await base44.entities.Deliverable.bulkCreate(dlvs.map((d) => ({ ...d, course_id: created.id })));
    if (mats.length) await base44.entities.Material.bulkCreate(mats.map((m) => ({ ...m, course_id: created.id })));
    refresh();
    return created;
  }
  async function updateCourse(id, patch) { await base44.entities.Course.update(id, patch); refresh(); }
  async function deleteCourse(id) {
    await base44.entities.Deliverable.deleteMany({ course_id: id }).catch(() => {});
    await base44.entities.Material.deleteMany({ course_id: id }).catch(() => {});
    await base44.entities.Course.delete(id);
    refresh();
  }
  async function createDeliverable(payload) { const d = await base44.entities.Deliverable.create(payload); refresh(); return d; }
  async function updateDeliverable(id, patch) { await base44.entities.Deliverable.update(id, patch); refresh(); }
  async function deleteDeliverable(id) { await base44.entities.Deliverable.delete(id); refresh(); }
  async function createMaterial(payload) { const m = await base44.entities.Material.create(payload); refresh(); return m; }
  async function updateMaterial(id, patch) { await base44.entities.Material.update(id, patch); refresh(); }
  async function deleteMaterial(id) { await base44.entities.Material.delete(id); refresh(); }
  async function logStudySession(payload) { const s = await base44.entities.StudySession.create(payload); refresh(); return s; }
  async function updateStudySession(id, patch) { await base44.entities.StudySession.update(id, patch); refresh(); }
  async function deleteStudySession(id) { await base44.entities.StudySession.delete(id); refresh(); }
  async function clearStudySessions(ids) { await Promise.all((ids || []).map((id) => base44.entities.StudySession.delete(id))); refresh(); }
  async function createFocus(payload) { const f = await base44.entities.Focus.create(payload); refresh(); return f; }
  async function updateFocus(id, patch) { await base44.entities.Focus.update(id, patch); refresh(); }
  async function deleteFocus(id) { await base44.entities.Focus.delete(id); refresh(); }

  // Track the latest EduSettings id across async gaps via a ref so back-to-back
  // updateSettings calls (e.g. the wizard's finish, or Settings-option toggles
  // firing before the first refresh applies) all target the same record. Without
  // this, the second call would see stale `data.settings` (still null), create a
  // new record, and shadow the first — losing the first call's fields.
  const settingsIdRef = React.useRef(null);
  React.useEffect(() => { settingsIdRef.current = data.settings?.id || null; }, [data.settings]);
  async function updateSettings(patch) {
    const id = settingsIdRef.current || data.settings?.id;
    if (id) {
      await base44.entities.EduSettings.update(id, patch);
    } else {
      const created = await base44.entities.EduSettings.create({ weekly_sleep_hours: 56, google_synced: false, ...patch });
      if (created?.id) settingsIdRef.current = created.id;
    }
    refresh();
  }

  // Customizable nav bar — stored on EduSettings.nav_items. saveNavItems
  // persists via updateSettings (which refreshes context) so the edu nav bars
  // re-render immediately.
  const navItems = data.settings?.nav_items ?? null;
  async function saveNavItems(nav_items) {
    try {
      await updateSettings({ nav_items });
      toast({ title: "Navigation updated" });
    } catch {
      toast({ title: "Could not save navigation", variant: "destructive" });
    }
  }

  const value = {
    ...data,
    loading,
    refresh,
    refreshKey,
    activeSemester,
    courses: coursesRich,
    allCourses: data.courses,
    deliverables,
    materials,
    deliverablesByCourse,
    materialsByCourse,
    streak,
    weeklyMinutes,
    hourlyBuckets,
    cumulativeGpa,
    semesterGpa,
    transcript,
    setActiveSemester,
    createSemester,
    createCourse,
    updateCourse,
    deleteCourse,
    createDeliverable,
    updateDeliverable,
    deleteDeliverable,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    logStudySession,
    updateStudySession,
    deleteStudySession,
    clearStudySessions,
    focuses,
    focusesByCourse,
    createFocus,
    updateFocus,
    deleteFocus,
    updateSettings,
    navItems,
    saveNavItems,
    aiResearchingIds,
    setAiResearching,
  };

  return <EduSyncContext.Provider value={value}>{children}</EduSyncContext.Provider>;
}

export function useEduSync() {
  const ctx = React.useContext(EduSyncContext);
  if (!ctx) throw new Error("useEduSync must be used within EduSyncProvider");
  return ctx;
}

// Preferred hook name (mirrors FinanceDataContext's useFinanceData).
export const useEduSyncData = useEduSync;

export function EduLayout() {
  // Splash shows only on the first Education entry of the session (matches
  // Haven Finance's sessionStorage-gated splash in Dashboard.jsx).
  const [showSplash, setShowSplash] = React.useState(() => {
    try { return sessionStorage.getItem("edu_splash_shown") !== "1"; } catch { return true; }
  });
  React.useEffect(() => { try { sessionStorage.setItem("edu_splash_shown", "1"); } catch {} }, []);
  const [showWizard, setShowWizard] = React.useState(() => isProfileAddressed() ? false : true);
  return (
    <EduSyncProvider>
      <EduShell>
        {showSplash && <EducationSplash onComplete={() => setShowSplash(false)} />}
        {!showSplash && (
          <ProfileWizard
            open={showWizard}
            onOpenChange={(o) => { setShowWizard(o); if (!o) markProfileSkipped(); }}
            onCompleted={() => setShowWizard(false)}
          />
        )}
        <Outlet />
      </EduShell>
    </EduSyncProvider>
  );
}

function EduShell({ children }) {
  const { loading, settings } = useEduSync();
  const theme = settings?.theme || DEFAULT_THEME;
  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <ThemeRoot theme={theme} app="education" className="dark min-h-screen relative">
      <div className="flex flex-col min-h-screen selection:bg-emerald-500/30">
        {children}
        <div className="pb-24 sm:pb-0" />
      </div>
    </ThemeRoot>
  );
}

export function HavenEduLogo({ to = "/" }) {
  return (
    <Link to={to} viewTransition title="Back to Haven Hub" className="flex items-center gap-2 shrink-0 group rounded-md px-1.5 -mx-1.5 py-1 hover:bg-white/5 transition-colors">
      <ArrowLeft className="h-3.5 w-3.5 text-white/40 group-hover:text-emerald-300 transition-colors" strokeWidth={2} />
      <div className="flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 transition-colors group-hover:border-emerald-400/50" style={{ height: 30, width: 30, viewTransitionName: "haven-logo" }}>
        <GraduationCap className="text-emerald-400" style={{ height: 16, width: 16 }} />
      </div>
      <span className="text-sm font-semibold tracking-tight text-white">Haven <span className="text-emerald-400">Education</span></span>
    </Link>
  );
}