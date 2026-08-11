import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Target, BookOpen, GraduationCap, AlertTriangle, Clock } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { percentToLetter, currentGrade, projectedGrade, neededForTarget } from "@/lib/eduGrading";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  AreaChart, Area,
} from "recharts";

function fmtPct(v) {
  return v != null ? `${v.toFixed(1)}%` : "—";
}

export default function EduAnalyticsPage() {
  const { courses, deliverables, studySessions, streak, weeklyMinutes, cumulativeGpa, semesterGpa, hourlyBuckets, activeSemester } = useEduSync();
  const navigate = useNavigate();

  // ── Per-course grade analysis ──
  const courseAnalytics = useMemo(() => {
    return (courses || []).map((c) => {
      const dlvs = (c.deliverables || []).filter((d) => d.weight > 0);
      const current = currentGrade(dlvs);
      const projected = projectedGrade(dlvs);
      const needed90 = neededForTarget(dlvs, 90);
      const needed80 = neededForTarget(dlvs, 80);
      const needed70 = neededForTarget(dlvs, 70);
      const graded = dlvs.filter((d) => d.graded && d.grade != null);
      const remaining = dlvs.filter((d) => !(d.graded && d.grade != null));
      const totalWeight = dlvs.reduce((s, d) => s + d.weight, 0);
      const gradedWeight = graded.reduce((s, d) => s + d.weight, 0);
      return {
        ...c,
        current,
        projected,
        needed90, needed80, needed70,
        gradedCount: graded.length,
        totalCount: dlvs.length,
        totalWeight,
        gradedWeight,
        remainingWeight: totalWeight - gradedWeight,
        riskLevel: current != null && current < 60 ? "high" : current != null && current < 70 ? "medium" : "low",
      };
    });
  }, [courses]);

  const atRisk = courseAnalytics.filter((c) => c.riskLevel === "high");
  const needsAttention = courseAnalytics.filter((c) => c.riskLevel === "medium");

  // ── Study trends ──
  const studyTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const mins = (studySessions || [])
        .filter((s) => s.completed_at?.slice(0, 10) === key)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      days.push({
        day: d.toLocaleDateString("en-CA", { weekday: "short" }),
        minutes: mins,
        hours: +(mins / 60).toFixed(1),
      });
    }
    return days;
  }, [studySessions]);

  const weekTotal = studyTrend.reduce((s, d) => s + d.minutes, 0);

  // ── Hourly energy chart ──
  const hourlyData = useMemo(() => {
    return (hourlyBuckets || []).map((mins, i) => ({
      hour: `${i}:00`,
      label: i === 0 ? "Midnight" : i < 12 ? `${i} AM` : i === 12 ? "Noon" : `${i - 12} PM`,
      minutes: mins,
      hours: +(mins / 60).toFixed(1),
    }));
  }, [hourlyBuckets]);

  const peakHour = useMemo(() => {
    let maxIdx = 0;
    (hourlyBuckets || []).forEach((m, i) => {
      if (m > (hourlyBuckets[maxIdx] || 0)) maxIdx = i;
    });
    return maxIdx;
  }, [hourlyBuckets]);

  // ── Grade distribution ──
  const gradeDist = useMemo(() => {
    const grades = [];
    courseAnalytics.forEach((c) => {
      if (c.current != null) grades.push(c.current);
    });
    if (!grades.length) return [];
    const bins = [
      { range: "90-100", min: 90, max: 100, count: 0, color: "#00E5A0" },
      { range: "80-89", min: 80, max: 89, count: 0, color: "#34d399" },
      { range: "70-79", min: 70, max: 79, count: 0, color: "#3B82F6" },
      { range: "60-69", min: 60, max: 69, count: 0, color: "#F59E0B" },
      { range: "<60", min: 0, max: 59, count: 0, color: "#FF4D4D" },
    ];
    grades.forEach((g) => {
      const bin = bins.find((b) => g >= b.min && g <= b.max);
      if (bin) bin.count++;
    });
    return bins;
  }, [courseAnalytics]);

  const gpaColor = cumulativeGpa >= 3.7 ? "text-emerald-400"
    : cumulativeGpa >= 3.0 ? "text-indigo-400"
    : cumulativeGpa >= 2.0 ? "text-amber-400"
    : "text-rose-400";

  return (
    <div className="dd-page-enter space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Performance Analytics</h1>
          <p className="text-sm text-white/50 mt-1">Deep dive into grades, study patterns, and projections.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/education/vault", { viewTransition: true })}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-indigo-400/30 text-indigo-300 text-xs font-medium hover:bg-indigo-500/10 transition-colors">
            <BookOpen className="h-3.5 w-3.5" /> Course Vault
          </button>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={GraduationCap} label="Cumulative GPA" value={cumulativeGpa != null ? cumulativeGpa.toFixed(2) : "—"} color={gpaColor} />
        <StatCard icon={BarChart3} label="Semester GPA" value={semesterGpa != null ? semesterGpa.toFixed(2) : "—"} color="text-indigo-300" />
        <StatCard icon={Clock} label="Study (7d)" value={`${(weekTotal / 60).toFixed(1)}h`} color="text-emerald-300" />
        <StatCard icon={TrendingUp} label="Peak Hour" value={hourlyData[peakHour]?.label || "—"} color="text-amber-300" />
      </div>

      {/* At-Risk & Attention Alerts */}
      {(atRisk.length > 0 || needsAttention.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {atRisk.length > 0 && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <p className="text-xs font-semibold text-rose-300 uppercase tracking-wider">At Risk</p>
              </div>
              <div className="space-y-2">
                {atRisk.map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-sm">
                    <span className="text-white/80">{c.code}</span>
                    <span className="text-rose-300 font-mono font-semibold">{fmtPct(c.current)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {needsAttention.length > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Needs Attention</p>
              </div>
              <div className="space-y-2">
                {needsAttention.map((c) => (
                  <div key={c.id} className="flex justify-between items-center text-sm">
                    <span className="text-white/80">{c.code}</span>
                    <span className="text-amber-300 font-mono font-semibold">{fmtPct(c.current)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grade Distribution */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Grade Distribution</h3>
          <span className="text-xs text-white/40 ml-auto">{courseAnalytics.length} courses</span>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradeDist} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v) => [`${v} course${v !== 1 ? "s" : ""}`, "Count"]}
                contentStyle={{ background: "#131D33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, color: "#fff" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {gradeDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Course-by-Course Breakdown */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Course Breakdown & Projections</h3>
        </div>
        <div className="space-y-2">
          {courseAnalytics.map((c) => {
            const scoreColor = c.current >= 80 ? "text-emerald-400"
              : c.current >= 60 ? "text-amber-300"
              : c.current != null ? "text-rose-400"
              : "text-white/40";
            return (
              <div key={c.id} className="rounded-xl border border-white/5 p-4 hover:border-white/10 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{c.code} — {c.title}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{c.gradedCount}/{c.totalCount} items graded</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold font-mono ${scoreColor}`}>{fmtPct(c.current)}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/30">{percentToLetter(c.current)}</p>
                  </div>
                </div>

                {/* Grade bar */}
                <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, c.current || 0)}%`,
                      background: c.current >= 80
                        ? "linear-gradient(90deg, #00E5A0, #34d399)"
                        : c.current >= 60
                          ? "linear-gradient(90deg, #F59E0B, #fbbf24)"
                          : "linear-gradient(90deg, #FF4D4D, #f87171)",
                    }}
                  />
                </div>

                {/* What-if projections */}
                <div className="flex items-center gap-3 text-[11px] flex-wrap">
                  {c.remainingWeight > 0 ? (
                    <>
                      <span className="text-white/40">Need for 90%: <span className={`font-mono font-semibold ${c.needed90 <= 100 ? (c.needed90 <= 80 ? "text-emerald-300" : c.needed90 <= 95 ? "text-amber-300" : "text-rose-300") : "text-rose-400"}`}>{fmtPct(c.needed90)}</span></span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40">Need for 80%: <span className={`font-mono font-semibold ${c.needed80 <= 80 ? "text-emerald-300" : c.needed80 <= 95 ? "text-amber-300" : "text-rose-300"}`}>{fmtPct(c.needed80)}</span></span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40">Remaining: <span className="font-mono text-white/60">{c.remainingWeight.toFixed(0)}%</span></span>
                    </>
                  ) : (
                    <span className="text-emerald-400/60">All items graded</span>
                  )}
                </div>
              </div>
            );
          })}
          {courseAnalytics.length === 0 && (
            <p className="text-sm text-white/40 text-center py-6">No courses with grade data yet.</p>
          )}
        </div>
      </div>

      {/* Study Hours This Week */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Study Hours (7 days)</h3>
          <span className="text-xs text-white/40 ml-auto">{weekTotal}m total</span>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={studyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
              <Tooltip
                formatter={(v, n) => [`${v} min`, n === "minutes" ? "Duration" : ""]}
                labelFormatter={(l) => l}
                contentStyle={{ background: "#131D33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, color: "#fff" }}
              />
              <Area type="monotone" dataKey="minutes" stroke="#34d399" strokeWidth={2} fill="url(#studyGrad)" dot={{ fill: "#34d399", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Peak Energy Hours */}
      {hourlyData.some((h) => h.minutes > 0) && (
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Peak Study Hours</h3>
            <span className="text-xs text-white/40 ml-auto">Peak: {hourlyData[peakHour]?.label}</span>
          </div>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 8 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fill: "#71717a", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}m`} />
                <Tooltip
                  formatter={(v) => [`${v} min`, "Study time"]}
                  contentStyle={{ background: "#131D33", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, fontSize: 12, color: "#fff" }}
                />
                <Bar dataKey="minutes" radius={[2, 2, 0, 0]}>
                  {hourlyData.map((entry, i) => (
                    <Cell key={i} fill={i === peakHour ? "#F59E0B" : "rgba(255,255,255,0.08)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Streak + Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Study Streak</p>
          </div>
          <p className="text-3xl font-bold text-white font-mono">{streak?.current || 0}<span className="text-lg text-white/40"> days</span></p>
          <p className="text-xs text-white/40 mt-1">Best: {streak?.longest || 0} days</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Course Health</p>
          </div>
          <p className="text-3xl font-bold text-white font-mono">
            {courseAnalytics.filter((c) => c.riskLevel === "low").length}<span className="text-lg text-white/40">/{courseAnalytics.length}</span>
          </p>
          <p className="text-xs text-white/40 mt-1">
            {atRisk.length > 0 ? `${atRisk.length} course${atRisk.length > 1 ? "s" : ""} at risk` : "All courses on track"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black p-4">
      <Icon className={`h-4 w-4 ${color || "text-white/40"} mb-1.5`} />
      <p className={`text-xl font-semibold font-mono tabular-nums ${color || "text-white"}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">{label}</p>
    </div>
  );
}