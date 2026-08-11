import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Flame, Plus, Settings as SettingsIcon, Pencil } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HavenEduLogo, useEduSync } from "@/lib/eduSyncContext";
import { nextSemesterAfter } from "@/components/edu/SemesterDetectModal";
import { useToast } from "@/components/ui/use-toast";
import CustomizeNavModal from "@/components/nav/CustomizeNavModal";
import { resolveNav, EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED } from "@/lib/navConfig";

const ADD_SEMESTER = "__add_semester__";

// NavDropdown is emerald-styled (which is the EduSync theme), so it doubles as
// the education "More" dropdown without any recoloring.

export default function EduTopBar() {
  const { activeSemester, semesters, setActiveSemester, streak, settings, createSemester, navItems, saveNavItems } = useEduSync();
  const { toast } = useToast();
  const [navOpen, setNavOpen] = useState(false);
  const synced = !!settings?.google_synced;

  const { primary, more } = resolveNav(navItems, EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED);

  async function addNextSemester() {
    if (!semesters.length) return;
    const sorted = [...semesters].sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
    const latest = sorted[0];
    if (!latest?.term_type) return;
    const next = nextSemesterAfter(latest.term_type, latest.year || new Date(latest.start_date).getFullYear());
    if (semesters.some((s) => s.term_label === next.term_label)) {
      const existing = semesters.find((s) => s.term_label === next.term_label);
      toast({ title: "This semester already exists" });
      if (existing) setActiveSemester(existing.id);
      return;
    }
    await createSemester({ ...next, is_active: true });
    toast({ title: `Added ${next.term_label}` });
  }

  const semProgress = React.useMemo(() => {
    const sem = activeSemester;
    if (!sem?.start_date || !sem?.end_date) return null;
    const s = new Date(sem.start_date + "T00:00:00");
    const e = new Date(sem.end_date + "T00:00:00");
    const now = new Date();
    if (now < s) return { pct: 0, week: 1, totalWeeks: 1 };
    const totalDays = (e - s) / (24 * 3600 * 1000);
    const elapsedDays = (now - s) / (24 * 3600 * 1000);
    const pct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    const totalWeeks = Math.round(totalDays / 7);
    const week = Math.min(totalWeeks, Math.floor(elapsedDays / 7) + 1);
    return { pct, week, totalWeeks: Math.max(1, totalWeeks) };
  }, [activeSemester]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center gap-3">
          <HavenEduLogo />

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1 ml-2 overflow-x-auto">
            {primary.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                viewTransition
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 h-9 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? "text-emerald-300 bg-emerald-500/10 border border-emerald-400/30"
                      : "text-white/55 hover:text-white hover:bg-white/5 border border-transparent"
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            {/* Semester selector */}
            {semesters.length > 0 && (
              <Select value={activeSemester?.id || ""} onValueChange={(v) => { if (v === ADD_SEMESTER) { addNextSemester(); return; } setActiveSemester(v); }}>
                <SelectTrigger className="hidden sm:flex h-8 w-[160px] bg-black border-white/10 text-xs">
                  <SelectValue placeholder="Term" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {semesters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.term_label}</SelectItem>
                  ))}
                  <div className="my-1 h-px bg-white/10" />
                  <SelectItem value={ADD_SEMESTER} className="text-emerald-300">
                    <span className="flex items-center gap-1.5"><Plus className="h-3 w-3" /> Add next semester</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Google sync status */}
            <span
              title={synced ? "Google Calendar connected" : "Google Calendar not connected"}
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-[10px] uppercase tracking-widest ${
                synced ? "border-emerald-400/40 text-emerald-300 bg-emerald-500/10" : "border-white/10 text-white/40"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${synced ? "bg-emerald-400" : "bg-white/30"}`} />
              <span className="hidden sm:inline">{synced ? "Synced" : "Not synced"}</span>
            </span>

            {/* Streak badge */}
            <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-amber-400/30 bg-amber-500/10 text-amber-300 text-xs font-mono tabular-nums">
              <Flame className="h-3.5 w-3.5" />
              {streak.current}<span className="hidden sm:inline text-[10px] uppercase tracking-widest text-amber-300/60 ml-0.5">day</span>
            </div>

            {/* Customize nav */}
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Customize navigation"
              title="Customize navigation"
              className="flex items-center justify-center h-8 w-8 rounded-md border border-white/10 text-white/50 hover:text-white hover:border-emerald-400/30 hover:bg-white/5 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>

            {/* Settings */}
            <NavLink
              to="/education/settings"
              viewTransition
              className="flex items-center gap-1.5 h-8 w-8 rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/5 transition-colors justify-center"
              aria-label="Settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </NavLink>
          </div>
        </div>
        {/* Semester progress bar */}
        {semProgress && (
          <div className="border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-8">
              <div className="flex items-center gap-2 h-5">
                <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
                    style={{ width: `${semProgress.pct}%` }}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono whitespace-nowrap shrink-0">
                  Wk {semProgress.week}/{semProgress.totalWeeks}
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      <CustomizeNavModal
        open={navOpen}
        onOpenChange={setNavOpen}
        pages={EDU_PAGES}
        defaultNav={EDU_DEFAULT_NAV}
        locked={EDU_LOCKED}
        navItems={navItems}
        onSave={saveNavItems}
        accent="emerald"
        title="Customize Education Navigation"
      />
    </>
  );
}