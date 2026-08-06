import React from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Clock, BookOpen, GraduationCap, CalendarDays, Plus, WifiOff } from "lucide-react";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import SemesterDetectModal from "@/components/edu/SemesterDetectModal";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import EduAssistant from "@/components/edu/EduAssistant";
import ProductivityCompare from "@/components/edu/ProductivityCompare";
import ScheduleTaskModal from "@/components/edu/ScheduleTaskModal";
import { Button } from "@/components/ui/button";
import { useEduSync, detectTerm } from "@/lib/eduSyncContext";
import { daysFromNow, badgeColor } from "@/components/edu/CourseCard";
import FocusRow from "@/components/edu/FocusRow";
import TaskFormModal from "@/components/edu/TaskFormModal";

const PRIORITY_BADGE = {
  high: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
};
function priorityBadge(p) { return PRIORITY_BADGE[p] || PRIORITY_BADGE.medium; }
function startUrl(f) {
  const params = new URLSearchParams();
  if (f.course_id) params.set("course", f.course_id);
  if (f.deliverable_id) params.set("deliverable", f.deliverable_id);
  params.set("focus", f.id);
  return `/education/timer?${params.toString()}`;
}

export default function EduDashboard() {
  const navigate = useNavigate();
  const { activeSemester, courses, deliverables, focuses, streak, weeklyMinutes, settings, createSemester } = useEduSync();
  const [detectOpen, setDetectOpen] = React.useState(false);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [editTask, setEditTask] = React.useState(null);
  const detected = React.useMemo(() => detectTerm(), []);

  React.useEffect(() => {
    if (!activeSemester) setDetectOpen(true);
  }, [activeSemester]);

  const today = new Date().toISOString().slice(0, 10);
  const courseById = React.useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c])), [courses]);

  const plannedFocuses = React.useMemo(() => (focuses || []).filter((f) => f.status === "planned"), [focuses]);
  const todaysFocuses = React.useMemo(() => plannedFocuses.filter((f) => (f.target_date || "") === today).sort((a, b) => (a.priority === "high" ? -1 : 0) - (b.priority === "high" ? -1 : 0)), [plannedFocuses, today]);
  const upcomingFocuses = React.useMemo(() => {
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in7Key = in7.toISOString().slice(0, 10);
    return plannedFocuses.filter((f) => (f.target_date || "") > today && (f.target_date || "") <= in7Key).sort((a, b) => (a.target_date || "").localeCompare(b.target_date || ""));
  }, [plannedFocuses, today]);

  const upcoming = React.useMemo(() => deliverables.filter((d) => !d.completed && (d.due_date || "") >= today).sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")).slice(0, 5), [deliverables, today]);
  const exams = React.useMemo(() => deliverables.filter((d) => d.is_exam && (d.due_date || "") >= today && !d.completed), [deliverables, today]);

  const synced = !!settings?.google_synced;
  const sampleSchedule = [
    { time: "09:00", title: "CSC110 Lecture", loc: "Room 204" },
    { time: "11:30", title: "MAT201 Tutorial", loc: "Room 110" },
    { time: "14:00", title: "Study — Midterm Prep", loc: "Library" },
  ];

  return (
    <>
      <EduTopBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageTitle title="Dashboard" subtitle={activeSemester ? `${activeSemester.term_label} · ${courses.length} courses` : "Set up your semester to begin"} icon={GraduationCap} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* MAIN — col-span-7 */}
          <div className="lg:col-span-7 space-y-6">
            {/* Today's Focus */}
            <Reveal>
              <div className="rounded-lg border border-white/10 bg-black p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/50">Today's Focus</p>
                  <Button size="sm" onClick={() => setTaskOpen(true)} className="bg-emerald-500 text-black hover:bg-emerald-400 h-7">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
                  </Button>
                </div>
                {todaysFocuses.length ? (
                  <div className="space-y-2">
                    {todaysFocuses.map((f) => (
                      <FocusRow key={f.id} focus={f} course={f.course_id ? courseById[f.course_id] : null} settings={settings} onStart={() => navigate(startUrl(f))} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/30 text-center py-6">No tasks for today — add one to get started!</p>
                )}
              </div>
            </Reveal>

            {/* Upcoming Deliverables */}
            <Reveal delay={0.04}>
              <div className="rounded-lg border border-white/10 bg-black p-5">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Upcoming Deliverables</p>
                {upcoming.length ? (
                  <div className="space-y-1.5">
                    {upcoming.map((d) => {
                      const c = courseById[d.course_id];
                      const days = daysFromNow(d.due_date);
                      return (
                        <button key={d.id} onClick={() => setEditTask(d)} className="w-full text-left flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/5 rounded px-1 -mx-1 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm text-zinc-100 truncate">{d.title}</p>
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{c?.code} · {d.due_date} · {d.type}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 border font-mono tabular-nums ${badgeColor(days)}`}>{days}d</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-white/30 text-center py-6">No upcoming deliverables.</p>
                )}
              </div>
            </Reveal>

            {/* Upcoming Focuses */}
            <Reveal delay={0.08}>
              <div className="rounded-lg border border-white/10 bg-black p-5">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Upcoming Focuses (next 7 days)</p>
                {upcomingFocuses.length ? (
                  <div>
                    {upcomingFocuses.map((f) => (
                      <FocusRow key={f.id} focus={f} course={f.course_id ? courseById[f.course_id] : null} settings={settings} compact />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/30 text-center py-6">No tasks planned for the next 7 days.</p>
                )}
              </div>
            </Reveal>
          </div>

          {/* SECONDARY — col-span-5 (schedule + stats + AI panel on lg) */}
          <div className="lg:col-span-5 space-y-6 lg:flex lg:flex-col">
            <Reveal>
              <div className="rounded-lg border border-white/10 bg-black p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/50">Daily Schedule</p>
                  {!synced && (
                    <button onClick={() => navigate("/education/settings")} className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-emerald-300 hover:text-emerald-200">
                      <WifiOff className="h-3 w-3" /> Connect
                    </button>
                  )}
                </div>
                {synced ? (
                  <div className="space-y-2">
                    {sampleSchedule.map((e, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-mono tabular-nums text-emerald-300 w-12">{e.time}</span>
                        <div className="flex-1">
                          <p className="text-xs text-zinc-100">{e.title}</p>
                          <p className="text-[10px] text-white/40">{e.loc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 opacity-50">
                    {sampleSchedule.map((e, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-mono tabular-nums text-white/40 w-12">{e.time}</span>
                        <p className="text-xs text-white/40">{e.title}</p>
                      </div>
                    ))}
                    <p className="text-[11px] text-white/30 pt-1">Connect Google Calendar to sync real events.</p>
                  </div>
                )}
              </div>
            </Reveal>

            <Reveal delay={0.04}>
              <ProductivityCompare />
            </Reveal>

            <Reveal delay={0.05}>
              <div className="rounded-lg border border-white/10 bg-black p-5">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Quick Stats</p>
                <div className="grid grid-cols-2 gap-3">
                  <Stat icon={Clock} label="Study this week" value={`${(weeklyMinutes / 60).toFixed(1)}h`} />
                  <Stat icon={Flame} label="Current streak" value={`${streak.current}d`} />
                  <Stat icon={BookOpen} label="Courses" value={courses.length} />
                  <Stat icon={CalendarDays} label="Upcoming exams" value={exams.length} />
                </div>
              </div>
            </Reveal>

            {/* AI side panel — persistent. On mobile sits below main content */}
            <Reveal delay={0.08}>
              <EduAssistant />
            </Reveal>
          </div>
        </div>
      </main>
      <EduBottomNav />

      <SemesterDetectModal
        open={detectOpen}
        detected={detected}
        onConfirm={(payload) => { createSemester(payload); setDetectOpen(false); }}
        onClose={() => setDetectOpen(false)}
      />
      <TaskFormModal open={taskOpen} onOpenChange={setTaskOpen} defaultDate={today} />
      <ScheduleTaskModal
        open={!!editTask}
        onOpenChange={(o) => { if (!o) setEditTask(null); }}
        deliverable={editTask || undefined}
      />
    </>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-white/10 p-3">
      <Icon className="h-3.5 w-3.5 text-emerald-300 mb-1.5" />
      <p className="text-lg font-semibold font-mono tabular-nums text-zinc-50">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
    </div>
  );
}