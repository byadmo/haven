import React, { useMemo } from "react";
import { TrendingUp, Flame, Target, BookOpen } from "lucide-react";
import { useSI } from "@/lib/SIContext";

export default function SIAnalyticsPage() {
  const { habits, entries, reflections, getStreak } = useSI();

  // Last 30 days completion matrix
  const last30 = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const done = entries.filter(e => e.date === key).length;
      const total = habits.length;
      days.push({
        date: key,
        day: d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
        done,
        total,
        pct: total > 0 ? done / total : 0,
      });
    }
    return days;
  }, [entries, habits]);

  // Mood distribution from reflections
  const moodStats = useMemo(() => {
    const counts = {};
    reflections.forEach(r => {
      const m = r.mood || "good";
      counts[m] = (counts[m] || 0) + 1;
    });
    const total = reflections.length || 1;
    return Object.entries(counts).map(([mood, count]) => ({
      mood,
      count,
      pct: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [reflections]);

  // Weekly average
  const weeklyAvg = useMemo(() => {
    const last7 = last30.slice(-7);
    const totalDone = last7.reduce((s, d) => s + d.done, 0);
    const totalPossible = last7.reduce((s, d) => s + d.total, 0);
    return totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  }, [last30]);

  const allTimeStreak = habits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);
  const avgStreak = habits.length > 0
    ? Math.round(habits.reduce((s, h) => s + getStreak(h.id), 0) / habits.length)
    : 0;

  const heatColor = (pct) => {
    if (pct === 0) return "bg-white/5";
    if (pct < 0.34) return "bg-amber-500/25";
    if (pct < 0.67) return "bg-amber-500/50";
    if (pct < 1) return "bg-amber-500/75";
    return "bg-amber-400";
  };

  return (
    <div className="dd-page-enter space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Analytics</h1>
        <p className="text-sm text-white/50 mt-1">Track your consistency and growth over time.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Weekly Avg", value: `${weeklyAvg}%`, icon: TrendingUp },
          { label: "Best Streak", value: `${allTimeStreak}d`, icon: Flame },
          { label: "Avg Streak", value: `${avgStreak}d`, icon: Target },
          { label: "Entries", value: `${reflections.length}`, icon: BookOpen },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-black p-4">
              <Icon className="h-4 w-4 text-amber-300 mb-2" strokeWidth={1.75} />
              <p className="text-xl font-semibold text-white">{s.value}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* 30-day heatmap */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-white mb-4">30-Day Completion Heatmap</h2>
        {habits.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">No habit data yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {last30.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full h-8 rounded-sm ${heatColor(d.pct)} transition-colors`}
                    title={`${d.date}: ${d.done}/${d.total} habits`}
                  />
                  {i % 5 === 0 && (
                    <span className="text-[8px] text-white/30">{d.day}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-end mt-3">
              <span className="text-[10px] text-white/30">Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-white/5" />
                <div className="w-3 h-3 rounded-sm bg-amber-500/25" />
                <div className="w-3 h-3 rounded-sm bg-amber-500/50" />
                <div className="w-3 h-3 rounded-sm bg-amber-500/75" />
                <div className="w-3 h-3 rounded-sm bg-amber-400" />
              </div>
              <span className="text-[10px] text-white/30">More</span>
            </div>
          </div>
        )}
      </div>

      {/* Mood distribution */}
      {reflections.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Mood Distribution</h2>
          <div className="space-y-2">
            {moodStats.map(m => {
              const colors = {
                great: "bg-emerald-400",
                good: "bg-amber-400",
                okay: "bg-orange-400",
                rough: "bg-red-400",
                bad: "bg-zinc-400",
              };
              return (
                <div key={m.mood} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-16 capitalize">{m.mood}</span>
                  <div className="flex-1 h-6 rounded-md bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-md ${colors[m.mood] || "bg-amber-400"} transition-all`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40 w-12 text-right">{m.count} ({m.pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
