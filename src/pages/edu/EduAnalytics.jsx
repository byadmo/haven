import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Flame, TrendingUp, TrendingDown, Clock, Calendar } from "lucide-react";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import CircularRing from "@/components/edu/CircularRing";
import StudyHeatmap from "@/components/edu/StudyHeatmap";
import StreakBadges from "@/components/edu/StreakBadges";
import { useEduSync } from "@/lib/eduSyncContext";
import GpaProjection from "@/components/edu/GpaProjection";
import CourseLoadAdvisor from "@/components/edu/CourseLoadAdvisor";
import SessionNotesList from "@/components/edu/SessionNotesList";

const WEEKS = 12;
const DAY_LABELS = ["S", "M", "T", "W", "Th", "F", "S"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function sundayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }

export default function EduAnalytics() {
  const { studySessions, streak, weeklyMinutes, hourlyBuckets, courses } = useEduSync();

  const totalHours = (studySessions || []).reduce((s, x) => s + (x.duration_minutes || 0), 0) / 60;

  // Heatmap minutes by date
  const byDate = React.useMemo(() => {
    const m = {};
    studySessions.forEach((s) => { const k = (s.completed_at || "").slice(0, 10); if (k) m[k] = (m[k] || 0) + (s.duration_minutes || 0); });
    return m;
  }, [studySessions]);

  const grid = React.useMemo(() => {
    const today = new Date();
    const thisSunday = sundayOf(today);
    const rows = [];
    for (let w = WEEKS - 1; w >= 0; w--) {
      const start = new Date(thisSunday); start.setDate(start.getDate() - w * 7);
      const row = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start); date.setDate(start.getDate() + d);
        if (date > today) { row.push(null); continue; }
        const k = date.toISOString().slice(0, 10);
        row.push({ date: k, minutes: byDate[k] || 0 });
      }
      rows.push(row);
    }
    return rows;
  }, [byDate]);

  // Peak energy
  const peakHour = hourlyBuckets.indexOf(Math.max(...hourlyBuckets));
  const peakLabel = peakHour < 12 ? "Morning" : peakHour < 17 ? "Afternoon" : "Evening";
  const energyData = hourlyBuckets.map((m, h) => ({ hour: h, minutes: m }));

  // Per-course weekly minutes
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const courseWeek = React.useMemo(() => {
    const m = {};
    studySessions.forEach((s) => { if (new Date(s.completed_at) >= weekStart && s.course_id) m[s.course_id] = (m[s.course_id] || 0) + (s.duration_minutes || 0); });
    return m;
  }, [studySessions, weekStart]);

  // Weekly summary
  const weekCount = studySessions.filter((s) => new Date(s.completed_at) >= weekStart).length;
  const avgSession = weekCount > 0 ? weeklyMinutes / weekCount : 0;
  const weekdayMinutes = [0, 0, 0, 0, 0, 0, 0];
  studySessions.forEach((s) => { if (new Date(s.completed_at) >= weekStart) weekdayMinutes[new Date(s.completed_at).getDay()] += s.duration_minutes || 0; });
  const topDayIdx = weekdayMinutes.indexOf(Math.max(...weekdayMinutes));
  const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const lastWeekMinutes = studySessions.filter((s) => { const d = new Date(s.completed_at); return d >= prevWeekStart && d < weekStart; }).reduce((s, x) => s + (x.duration_minutes || 0), 0);
  const wow = lastWeekMinutes > 0 ? ((weeklyMinutes - lastWeekMinutes) / lastWeekMinutes) * 100 : null;

  return (
    <>
      <EduTopBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageTitle title="Analytics" subtitle="Productivity & study insights" icon={TrendingUp} />

        {/* Streaks */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Flame className="h-8 w-8 text-amber-400" />
                  <div>
                    <p className="text-3xl font-bold font-mono tabular-nums text-zinc-50">{streak.current}<span className="text-base text-white/40">d</span></p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Current streak</p>
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-white/60">{streak.longest}<span className="text-sm text-white/30">d</span></p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Longest</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-white/60">{totalHours.toFixed(0)}<span className="text-sm text-white/30">h</span></p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">All time</p>
                </div>
              </div>
            </div>
            <div className="mt-4"><StreakBadges current={streak.current} longest={streak.longest} totalHours={totalHours} /></div>
          </div>
        </Reveal>

        <div className="space-y-6">
          {/* Study heatmap */}
          <Reveal>
            <StudyHeatmap />
          </Reveal>

          {/* Peak energy */}
          <Reveal delay={0.04}>
            <div className="rounded-lg border border-white/10 bg-black p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-widest text-white/50">Peak Energy</p>
                <span className="text-xs text-emerald-300">Peak: {peakLabel} · {peakHour}:00</span>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={energyData}>
                    <XAxis dataKey="hour" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(h) => h % 3 === 0 ? `${h}` : ""} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip cursor={false} contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}m`, "Study"]} labelFormatter={(h) => `${h}:00`} />
                    <Bar dataKey="minutes" radius={[3, 3, 0, 0]}>
                      {energyData.map((e, i) => <Cell key={i} fill={i === peakHour ? "#34d399" : "rgba(52,211,153,0.35)"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Course breakdown */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Course Breakdown · this week</p>
            {courses.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {courses.map((c) => {
                  const weekMin = courseWeek[c.id] || 0;
                  const pct = c.target_weekly_hours > 0 ? Math.min(100, (weekMin / 60 / c.target_weekly_hours) * 100) : 0;
                  return (
                    <div key={c.id} className="rounded-md border border-white/10 p-3 flex flex-col items-center text-center">
                      <CircularRing value={pct} size={92} stroke={7} sub="of target" />
                      <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono mt-2">{c.code}</p>
                      <p className="text-xs text-zinc-100 truncate w-full">{c.title}</p>
                      <p className="text-[10px] text-white/40 font-mono mt-0.5">{(weekMin / 60).toFixed(1)}h / {c.target_weekly_hours}h</p>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-white/30 text-center py-6">No courses yet.</p>}
          </div>
        </Reveal>

        {/* Weekly summary */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Weekly Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Sum icon={Clock} label="Focus this week" value={`${(weeklyMinutes / 60).toFixed(1)}h`} />
              <Sum icon={Clock} label="Avg session" value={`${Math.round(avgSession)}m`} />
              <Sum icon={Calendar} label="Top day" value={DAY_LABELS[topDayIdx]} />
              <Sum icon={wow != null && wow >= 0 ? TrendingUp : TrendingDown} label="vs last week" value={wow != null ? `${wow >= 0 ? "+" : ""}${wow.toFixed(0)}%` : "—"} highlight={wow != null && wow >= 0} />
            </div>
          </div>
        </Reveal>

        {/* GPA projection */}
        <Reveal>
          <GpaProjection />
        </Reveal>

        {/* Course load advisor */}
        <Reveal delay={0.03}>
          <CourseLoadAdvisor />
        </Reveal>

        {/* Session notes */}
        <Reveal delay={0.04}>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <SessionNotesList />
          </div>
        </Reveal>
      </main>
      <EduBottomNav />
    </>
  );
}

function Sum({ icon: Icon, label, value, highlight }) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <Icon className={`h-3.5 w-3.5 mb-1.5 ${highlight ? "text-emerald-300" : "text-white/40"}`} />
      <p className="text-lg font-semibold font-mono tabular-nums text-zinc-50">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
    </div>
  );
}