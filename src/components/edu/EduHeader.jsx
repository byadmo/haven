import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Ellipsis, GraduationCap, Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEduSync } from "@/lib/eduSyncContext";
import { nextSemesterAfter, upcomingTerms } from "@/components/edu/SemesterDetectModal";
import { useToast } from "@/components/ui/use-toast";
import { resolveNav, EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED } from "@/lib/navConfig";

const MAX_ICONS = 4;
const ADD_SEMESTER = "__add_semester__";

const isItemActive = (to, end, pathname) =>
  end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

export default function EduHeader() {
  const { navItems, activeSemester, semesters, setActiveSemester, createSemester } = useEduSync();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const { primary, more } = resolveNav(navItems, EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED);
  const icons = primary.slice(0, MAX_ICONS);
  const drawerItems = [...primary.slice(MAX_ICONS), ...more];
  const moreActive = drawerItems.some(s => isItemActive(s.to, s.end, location.pathname));

  async function createFirstSemester() {
    const [upcoming] = upcomingTerms();
    if (!upcoming) return;
    await createSemester({ ...upcoming, is_active: true });
    toast({ title: `Created ${upcoming.term_label}` });
  }

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

  return (
    <header
      className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 select-none"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center gap-3">
        <Link to="/" viewTransition title="Back to Haven Hub" className="flex items-center gap-2 shrink-0 group rounded-md px-1.5 -mx-1.5 py-1 hover:bg-white/5 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5 text-white/40 group-hover:text-emerald-300 transition-colors" strokeWidth={2} />
          <div className="flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 transition-colors group-hover:border-emerald-400/50" style={{ height: 30, width: 30, viewTransitionName: "haven-logo" }}>
            <GraduationCap className="text-emerald-400" style={{ height: 16, width: 16 }} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Haven <span className="text-emerald-400">Education</span></span>
        </Link>

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

        {/* Semester selector */}
        {semesters.length === 0 ? (
          <button
            type="button"
            onClick={createFirstSemester}
            className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs px-3 ml-auto hover:bg-emerald-500/20 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Create semester
          </button>
        ) : (
          <Select value={activeSemester?.id || ""} onValueChange={(v) => { if (v === ADD_SEMESTER) { addNextSemester(); return; } setActiveSemester(v); }}>
            <SelectTrigger className="flex h-8 w-[140px] sm:w-[160px] bg-black border-white/10 text-xs ml-auto">
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
      </div>
    </header>
  );
}

export function EduMobileNav() {
  const { navItems } = useEduSync();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const { primary, more } = resolveNav(navItems, EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED);
  const icons = primary.slice(0, MAX_ICONS);
  const drawerItems = [...primary.slice(MAX_ICONS), ...more];
  const moreActive = drawerItems.some(s => isItemActive(s.to, s.end, location.pathname));

  const activeIndex = icons.findIndex(p => isItemActive(p.to, p.end, location.pathname));
  const iconClass = (isActive) =>
    `relative h-[18px] w-[18px] transition-colors duration-200 ${isActive ? "text-emerald-300" : "text-white/45"}`;

  return (
    <>
      <nav
        className="sm:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        aria-label="Education"
      >
        <div
          className="pointer-events-auto relative flex items-center justify-between rounded-full border border-white/10 bg-black/90 backdrop-blur-xl px-2"
          style={{ height: 56, width: "min(94vw, 392px)", borderRadius: 999, boxShadow: "0 10px 30px -8px rgba(0,0,0,0.6)" }}
        >
          {icons.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              viewTransition
              aria-label={label}
              className="relative grid place-items-center rounded-full"
              style={{ height: 48, width: 48 }}
            >
              {({ isActive }) => <Icon className={iconClass(isActive)} strokeWidth={1.75} />}
            </NavLink>
          ))}
          {drawerItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              className="relative grid place-items-center rounded-full"
              style={{ height: 48, width: 48 }}
            >
              <Ellipsis className={iconClass(moreActive)} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-sm font-mono tracking-tight text-zinc-100">
              <Ellipsis className="h-4 w-4 text-emerald-400" /> More
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-6 pt-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
            {drawerItems.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => { setMoreOpen(false); navigate(to, { viewTransition: true }); }}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-3.5 text-left transition-colors ${
                  location.pathname === to
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-black text-zinc-300 hover:border-white/25"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}