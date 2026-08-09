import React from "react";
import { Link } from "react-router-dom";
import { Target, Flame, BookOpen, TrendingUp, ArrowRight } from "lucide-react";
import { useSI } from "@/lib/SIContext";
import { SI_PAGES } from "@/lib/SILayout";
import { StatGridSkeleton } from "@/components/ui/skeleton-presets";
import { useGrowth } from "@/lib/GrowthContext";

export default function SIDashboard() {
  const { habits, entries, reflections, getStreak, getTodayStatus, loaded } = useSI();
  const { totalXp, level, xpInLevel, xpForNext } = useGrowth();

  const todayDone = habits.filter(h => getTodayStatus(h.id)).length;
  const totalHabits = habits.length;
  const todayPct = totalHabits > 0 ? Math.round((todayDone / totalHabits) * 100) : 0;
  const bestStreak = habits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);
  const totalCheckins = entries.length;
  const totalReflections = reflections.length;

  const stats = [
    { label: "Today's Progress", value: `${todayDone}/${totalHabits}`, sub: `${todayPct}% complete`, icon: Target, color: "amber" },
    { label: "Best Streak", value: `${bestStreak}`, sub: bestStreak === 1 ? "day" : "days", icon: Flame, color: "orange" },
    { label: "Total Check-ins", value: `${totalCheckins}`, sub: "all time", icon: TrendingUp, color: "emerald" },
    { label: "Journal Entries", value: `${totalReflections}`, sub: "reflections", icon: BookOpen, color: "blue" },
  ];

  const colorMap = {
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    orange: "border-orange-400/30 bg-orange-500/10 text-orange-300",
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    blue: "border-blue-400/30 bg-blue-500/10 text-blue-300",
  };

  return (
    <div className="dd-page-enter space-y-6">
      <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Growth Dashboard</h1>
              <p className="text-sm text-white/50 mt-1">Your habits, streaks, and reflections at a glance.</p>
            </div>

            {/* XP / Level bar */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/5 to-teal-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Level {level}</span>
                </div>
                <span className="text-xs text-white/50">{totalXp} total XP</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-teal-400 transition-all"
                  style={{ width: `${(xpInLevel / Math.max(xpForNext, 1)) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-white/30 mt-1">{xpInLevel} / {xpForNext} XP to next level</p>
            </div>

            {/* Stats grid — skeleton while loading */}
      {!loaded ? (
        <StatGridSkeleton count={4} />
      ) : (
        <div className="haven-fade-in grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-black p-4 sm:p-5 transition-all duration-200 hover:border-white/20">
                <div className={`inline-flex items-center justify-center rounded-lg border h-9 w-9 mb-3 ${colorMap[s.color]}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">{s.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's habits quick view */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Today's Habits</h2>
          <Link to="/growth/habits" className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {habits.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No habits yet. Add your first habit to start building streaks.</p>
            <Link to="/growth/habits" className="inline-flex items-center gap-1.5 mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
              <Target className="h-3.5 w-3.5" /> Create Habit
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {habits.slice(0, 5).map(h => {
              const done = getTodayStatus(h.id);
              const streak = getStreak(h.id);
              return (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2 w-2 rounded-full ${done ? "bg-amber-400" : "bg-white/20"}`} />
                    <span className={`text-sm ${done ? "text-white" : "text-white/60"}`}>{h.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {streak > 0 && (
                      <span className="flex items-center gap-1 text-xs text-orange-300">
                        <Flame className="h-3 w-3" /> {streak}
                      </span>
                    )}
                    <span className={`text-xs ${done ? "text-amber-300" : "text-white/30"}`}>{done ? "Done" : "Pending"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {SI_PAGES.slice(1).map(p => {
          const Icon = p.icon;
          return (
            <Link
              key={p.id}
              to={p.to}
              className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black p-4 hover:border-amber-400/30 transition-colors"
            >
              <div className="inline-flex items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/5 h-9 w-9">
                <Icon className="h-4 w-4 text-amber-300" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{p.label}</p>
                <p className="text-xs text-white/40">View {p.label.toLowerCase()}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-amber-300 ml-auto transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
