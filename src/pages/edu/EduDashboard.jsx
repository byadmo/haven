import React from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Clock, BookOpen, GraduationCap, CalendarDays, Play, WifiOff, ArrowRight } from "lucide-react";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import SemesterDetectModal from "@/components/edu/SemesterDetectModal";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import { useEduSync, detectTerm } from "@/lib/eduSyncContext";
import EduAssistant from "@/components/edu/EduAssistant";
import { Button } from "@/components/ui/button";
import { daysFromNow, badgeColor } from "@/components/edu/CourseCard";

export default function EduDashboard() {
  const navigate = useNavigate();
  const { activeSemester, courses, deliverables, streak, weeklyMinutes, settings, createSemester } = useEduSync();
  const [detectOpen, setDetectOpen] = React.useState(false);
  const detected = React.useMemo(() => detectTerm(), []);

  React.useEffect(() => {
    if (!activeSemester) setDetectOpen(true);
  }, [activeSemester]);

  const today = new Date().toISOString().slice(0, 10);
  const focusItems = courses.map((c) => c.next).filter(Boolean).filter((d) => (d.due_date || "") >= today && daysFromNow(d.due_date) <= 7).slice(0, 4);
  const upcoming = deliverables.filter((d) => !d.completed && (d.due_date || "") >= today).sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")).slice(0, 5);
  const exams = deliverables.filter((d) => d.is_exam && (d.due_date || "") >= today && !d.completed);
  const synced = !!settings?.google_synced;

  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]));
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

        <Reveal>
          <EduAssistant />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-3 space-y-6">
            {/* Today's Focus */}
            <Reveal>
              <div className="rounded-lg border border-white/10 bg-black p-5">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Today's Focus</p>
                {focusItems.length ? (
                  <div className="space-y-2">
                    {focusItems.map((d) => {
                      const c = courseById[d.course_id];
                      return (
                        <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 p-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono">{c?.code}</p>
                            <p className="text-sm text-zinc-100 truncate">{d.title}</p>
                            <p className="text-[11px] text-white/40 font-mono">25 min · due {d.due_date}</p>
                          </div>
                          <Button size="sm" onClick={() => navigate(`/education/timer?course=${d.course_id}&deliverable=${d.id}`)} className="bg-emerald-500 text-black hover:bg-emerald-400 shrink-0">
                            <Play className="h-3.5 w-3.5 mr-1" /> Start
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-white/30 text-center py-6">No focus sessions — you're all caught up!</p>
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
                        <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                          <div className="min-w-0">
                            <p className="text-sm text-zinc-100 truncate">{d.title}</p>
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">{c?.code} · {d.due_date}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 border font-mono tabular-nums ${badgeColor(days)}`}>{days}d</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-white/30 text-center py-6">No upcoming deliverables.</p>
                )}
              </div>
            </Reveal>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-2 space-y-6">
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