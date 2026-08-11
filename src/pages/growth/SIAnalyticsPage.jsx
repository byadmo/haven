import React, { useMemo } from "react";
import { TrendingUp, Flame, Target, BookOpen, Brain, Award } from "lucide-react";
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

  // Mood distribution
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

  // Mood-habit correlation
  const moodCorrelation = useMemo(() => {
    if (habits.length === 0 || reflections.length === 0) return null;
    // For each habit, check if completed days correlate with good moods
    const results = habits.map(h => {
      let goodMoodDays = 0;
      let badMoodDays = 0;
      let goodMoodDone = 0;
      let badMoodDone = 0;

      reflections.forEach(r => {
        const date = (r.date || r.created_date || "").slice(0, 10);
        const done = entries.some(e => e.focus_id === h.id && e.date === date);
        const isGoodMood = ["great", "good"].includes(r.mood);

        if (isGoodMood) {
          goodMoodDays++;
          if (done) goodMoodDone++;
        } else {
          badMoodDays++;
          if (done) badMoodDone++;
        }
      });

      return {
        name: h.name,
        goodPct: goodMoodDays > 0 ? Math.round((goodMoodDone / goodMoodDays) * 100) : 0,
        badPct: badMoodDays > 0 ? Math.round((badMoodDone / badMoodDays) * 100) : 0,
        diff: 0,
      };
    });

    results.forEach(r => { r.diff = r.goodPct - r.badPct; });
    return results.sort((a, b) => b.diff - a.diff).slice(0, 5);
  }, [habits, entries, reflections]);

  // Monthly report card
  const monthlyReport = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthEntries = entries.filter(e => {
      const d = new Date(e.date + "T00:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const monthReflections = reflections.filter(r => {
      const d = new Date(r.date || r.created_date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    const totalPossible = habits.length * daysInMonth;
    const completionPct = totalPossible > 0 ? Math.round((monthEntries.length / totalPossible) * 100) : 0;

    // Top habit this month
    const habitCounts = {};
    monthEntries.forEach(e => {
      if (e.focus_id) habitCounts[e.focus_id] = (habitCounts[e.focus_id] || 0) + 1;
    });
    let topHabit = "—";
    let topCount = 0;
    Object.entries(habitCounts).forEach(([id, count]) => {
      if (count > topCount) {
        const h = habits.find(x => x.id === id);
        if (h) { topHabit = h.name; topCount = count; }
      }
    });

    // Best streak in month
    const maxStreak = habits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);

    return { completionPct, monthReflections: monthReflections.length, topHabit, maxStreak, daysInMonth };
  }, [habits, entries, reflections, getStreak]);

  // Consistency score
  const consistencyScore = useMemo(() => {
    if (habits.length === 0) return 0;
    const avgStreak = habits.reduce((s, h) => s + getStreak(h.id), 0) / habits.length;
    const weeklyAvg = last30.slice(-7).reduce((s, d) => s + d.pct, 0) / 7;
    const score = Math.round((avgStreak / 30 * 40) + (weeklyAvg * 60));
    return Math.min(100, Math.max(0, score));
  }, [habits, getStreak, last30]);

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

  const scoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-300";
    return "text-red-400";
  };

  return (
    <div className="dd-page-enter space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Analytics</h1>
        <p className="text-sm text-white/50 mt-1">Track your consistency and growth over time.</p>
      </div>

      {/* Consistency Score */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/5 to-teal-500/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Consistency Score</h2>
          </div>
          <span className={`text-2xl font-bold tabular-nums ${scoreColor(consistencyScore)}`}>
            {consistencyScore}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${consistencyScore}%`,
              background: consistencyScore >= 80
                ? "linear-gradient(90deg, #00E5A0, #3B82F6)"
                : consistencyScore >= 50
                  ? "linear-gradient(90deg, #F59E0B, #F97316)"
                  : "linear-gradient(90deg, #FF4D4D, #EF4444)",
            }}
          />
        </div>
        <p className="text-[10px] text-white/30 mt-1">
          {consistencyScore >= 80 ? "🔥 Excellent consistency!" : consistencyScore >= 50 ? "👍 Good — room to grow" : "💪 Building momentum"}
        </p>
      </div>

      {/* Monthly Report Card */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Monthly Report Card</h2>
          <span className="text-[10px] text-white/30 ml-auto">
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xl font-semibold text-white">{monthlyReport.completionPct}%</p>
            <p className="text-[10px] text-white/40">Completion</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-white">{monthlyReport.maxStreak}d</p>
            <p className="text-[10px] text-white/40">Best streak</p>
          </div>
          <div className="col-span-2">
            <p className="text-xl font-semibold text-white truncate">{monthlyReport.topHabit}</p>
            <p className="text-[10px] text-white/40">Top habit this month</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Weekly Avg", value: `${weeklyAvg}%`, icon: TrendingUp, color: "text-amber-300" },
          { label: "Best Streak", value: `${allTimeStreak}d`, icon: Flame, color: "text-orange-300" },
          { label: "Avg Streak", value: `${avgStreak}d`, icon: Target, color: "text-teal-300" },
          { label: "Entries", value: `${reflections.length}`, icon: BookOpen, color: "text-blue-300" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-black p-4">
              <Icon className={`h-4 w-4 ${s.color} mb-2`} strokeWidth={1.75} />
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

      {/* Mood-habit correlation */}
      {moodCorrelation && moodCorrelation.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Mood & Habit Correlation</h2>
          </div>
          <p className="text-[10px] text-white/30 mb-3">How often you complete each habit on good-mood days vs bad-mood days</p>
          <div className="space-y-3">
            {moodCorrelation.map(m => (
              <div key={m.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/70">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400">{m.goodPct}%</span>
                    <span className="text-[10px] text-white/20">|</span>
                    <span className="text-[10px] text-red-400">{m.badPct}%</span>
                  </div>
                </div>
                <div className="flex gap-1 h-1.5">
                  <div className="flex-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400/60 transition-all" style={{ width: `${m.goodPct}%` }} />
                  </div>
                  <div className="flex-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-red-400/40 transition-all" style={{ width: `${m.badPct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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