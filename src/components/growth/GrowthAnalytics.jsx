import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { TrendingUp, CalendarDays, Target, Brain } from "lucide-react";
import { useSI } from "@/lib/SIContext";
import { calculateHabitScore, weekdayWeekendRates } from "@/lib/useHabitScore";

const COLORS = ["#00E5A0", "#3B82F6", "#F59E0B", "#A78BFA", "#FF4D4D", "#22D3EE", "#EC4899"];

export default function GrowthAnalytics() {
  const { habits, entries } = useSI();

  // Actually calculate scores directly
  const scoreData = useMemo(() => {
    return habits.map((h, i) => ({
      name: (h.name || "Habit").length > 12 ? (h.name || "Habit").slice(0, 10) + "…" : h.name || "Habit",
      score: Math.round(calculateHabitScore({ habit: h }) * 100),
      diffs: h.difficulty ?? 3,
      reps: h.cumulative_repetitions ?? 0,
      fill: COLORS[i % COLORS.length],
    }));
  }, [habits, entries]);

  // ── Weekday vs Weekend ──
  const rates = useMemo(() => weekdayWeekendRates(entries), [entries]);

  const ratesData = useMemo(() => [
    { name: "Weekday", rate: Math.round((rates.weekdayRate || 0) * 100), fill: "#00E5A0" },
    { name: "Weekend", rate: Math.round((rates.weekendRate || 0) * 100), fill: "#3B82F6" },
    { name: "Overall", rate: Math.round((rates.overall || 0) * 100), fill: "#A78BFA" },
  ], [rates]);

  // ── Streak history (last 30 days) ──
  const streakHistory = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const done = entries.filter((e) => e.date === key).length;
      const label = d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2);
      days.push({ label, date: key, done, fullRate: Math.min(done / Math.max(habits.length, 1), 1) });
    }
    return days;
  }, [entries, habits]);

  return (
    <div className="dd-page-enter space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Deep Analytics</h1>
        <p className="text-sm text-white/50 mt-1">Habit strength scores, completion rates, and streak history.</p>
      </div>

      {/* Habit Strength Scores */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Habit Strength Scores</h2>
        </div>
        {scoreData.length === 0 ? (
          <p className="text-sm text-white/30 text-center py-8">No habits to analyze yet.</p>
        ) : (
          <div className="space-y-3">
            {scoreData.map((d) => (
              <div key={d.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">{d.name}</span>
                  <span className={`text-xs font-mono tabular-nums ${d.score >= 80 ? "text-emerald-400" : d.score >= 40 ? "text-amber-300" : "text-red-400"}`}>{d.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.score}%`, background: d.score >= 80 ? "linear-gradient(90deg, #00E5A0, #3B82F6)" : d.score >= 40 ? "linear-gradient(90deg, #F59E0B, #F97316)" : "linear-gradient(90deg, #FF4D4D, #EF4444)" }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/30">
                  <span>Difficulty: {d.diffs}</span>
                  <span>{d.reps} total reps</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekday vs Weekend */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">Weekday vs Weekend</h2>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ratesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: "#131D33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {ratesData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 30-Day Streak History */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">30-Day Completion</h2>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={streakHistory} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
              <YAxis hide domain={[0, 1]} />
              <Tooltip
                formatter={(v) => `${Math.round(v * 100)}%`}
                labelFormatter={(l) => streakHistory.find((s) => s.label === l)?.date || l}
                contentStyle={{ background: "#131D33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, color: "#fff" }}
              />
              <Bar dataKey="fullRate" radius={[2, 2, 0, 0]}>
                {streakHistory.map((entry, i) => (
                  <Cell key={i} fill={entry.fullRate >= 1 ? "#00E5A0" : entry.fullRate >= 0.5 ? "#3B82F6" : entry.fullRate > 0 ? "#F59E0B" : "rgba(255,255,255,0.08)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-end gap-3 mt-3">
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-[#00E5A0]" /><span className="text-[10px] text-white/30">Complete</span></div>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-[#3B82F6]" /><span className="text-[10px] text-white/30">Partial</span></div>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-[#F59E0B]" /><span className="text-[10px] text-white/30">Low</span></div>
          <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-sm bg-white/10" /><span className="text-[10px] text-white/30">None</span></div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Weekday Rate", value: `${Math.round((rates.weekdayRate || 0) * 100)}%`, icon: CalendarDays, color: "text-emerald-400" },
          { label: "Weekend Rate", value: `${Math.round((rates.weekendRate || 0) * 100)}%`, icon: CalendarDays, color: "text-blue-400" },
          { label: "Total Habits", value: String(habits.length), icon: Target, color: "text-amber-400" },
          { label: "Total Check-ins", value: String(entries.length), icon: Brain, color: "text-purple-400" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-white/10 bg-black p-4">
              <Icon className={`h-4 w-4 ${s.color} mb-1.5`} />
              <p className="text-lg font-semibold text-white">{s.value}</p>
              <p className="text-[10px] text-white/40">{s.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}