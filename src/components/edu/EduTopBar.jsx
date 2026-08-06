import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Flame, ArrowLeftRight, Settings as SettingsIcon } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EDU_NAV, HavenEduLogo, useEduSync } from "@/lib/eduSyncContext";

export default function EduTopBar() {
  const { activeSemester, semesters, setActiveSemester, streak, settings } = useEduSync();
  const synced = !!settings?.google_synced;

  return (
    <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <HavenEduLogo />

        {/* Desktop tabs */}
        <nav className="hidden sm:flex items-center gap-1 ml-4">
          {EDU_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 h-9 rounded-md text-xs font-medium transition-colors ${
                  isActive ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30" : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                }`
              }
            >
              <n.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          {/* Semester selector */}
          {semesters.length > 0 && (
            <Select value={activeSemester?.id || ""} onValueChange={(v) => setActiveSemester(v)}>
              <SelectTrigger className="hidden sm:flex h-8 w-[150px] bg-black border-white/10 text-xs">
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.term_label}</SelectItem>
                ))}
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

          {/* Settings */}
          <Link
            to="/education/settings"
            className="flex items-center gap-1.5 h-8 w-8 rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30 hover:bg-white/5 transition-colors justify-center"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>

          {/* Finance app link */}
          <Link
            to="/"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-white/10 text-[10px] uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-colors"
          >
            <ArrowLeftRight className="h-3 w-3" />
            <span className="hidden sm:inline">Finance</span>
          </Link>
        </div>
      </div>
    </header>
  );
}