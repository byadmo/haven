import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Timer, Target, TrendingUp, BookOpen, CalendarDays, Play, Brain, BarChart3 } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import PomodoroTimer from "@/components/growth/PomodoroTimer";
import EduAssistant from "@/components/edu/EduAssistant";
import WorkStudyBalance from "@/components/edu/WorkStudyBalance";
import { Button } from "@/components/ui/button";

export default function EduHome() {
  const { activeSemester, courses, tasks, entries } = useEduSync();
  const navigate = useNavigate();
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  const nextDeadline = useMemo(() => {
    const now = new Date();
    const upcoming = (tasks || [])
      .filter((t) => t.due_date && new Date(t.due_date) > now)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    return upcoming[0] || null;
  }, [tasks]);

  const totalCourses = courses?.length || 0;
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.completed)?.length || 0;
  const tasksPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const weekCheckins = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return (entries || []).filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d >= weekAgo && d <= now;
    }).length;
  }, [entries]);

  return (
    <div className="dd-page-enter space-y-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Education Home</h1>
        <p className="text-sm text-white/50 mt-1">
          {activeSemester ? `${activeSemester.term_label || "Current semester"} · ${totalCourses} courses` : "No active semester"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Up Next */}
        <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-indigo-400" />
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Up Next</p>
          </div>
          {nextDeadline ? (
            <>
              <p className="text-lg font-semibold text-white">{nextDeadline.title || nextDeadline.name}</p>
              <p className="text-sm text-white/50 mt-1">Due {new Date(nextDeadline.due_date).toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" })}{nextDeadline.course_id ? ` · ${courses?.find((c) => c.id === nextDeadline.course_id)?.name || ""}` : ""}</p>
              <span className="inline-block text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-400/30 rounded-md px-2.5 py-1 mt-3">{Math.ceil((new Date(nextDeadline.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days remaining</span>
            </>
          ) : <p className="text-sm text-white/40">No upcoming deadlines.</p>}
        </div>

        {/* Quick Flow */}
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-xl border border-indigo-400/30 bg-indigo-500/10 grid place-items-center mb-3">
            <Timer className="h-6 w-6 text-indigo-300" />
          </div>
          <p className="text-sm font-semibold text-white">Start Focus Session</p>
          <p className="text-xs text-white/40 mt-1 mb-4">25-min Pomodoro</p>
          <Button onClick={() => setPomodoroOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white h-10 px-6 rounded-xl">
            <Play className="h-4 w-4 mr-1.5" /> Start Flow
          </Button>
        </div>

        {/* Vitals */}
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Vitals</p>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-white/50">Tasks</span><span className="text-white font-mono">{tasksPct}%</span></div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400" style={{ width: `${tasksPct}%` }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-lg font-semibold text-white font-mono">{weekCheckins}</p><p className="text-[10px] text-white/40">7-day check-ins</p></div>
              <div><p className="text-lg font-semibold text-white font-mono">{totalCourses}</p><p className="text-[10px] text-white/40">Courses</p></div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-amber-400" />
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Stats</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Assignments", value: String(tasks?.filter((t) => t.type === "assignment")?.length || 0) },
              { label: "Study Hours", value: String(Math.round(weekCheckins * 0.5)) },
              { label: "Courses", value: String(totalCourses) },
              { label: "Completion", value: `${tasksPct}%` },
            ].map((s) => (
              <div key={s.label}><p className="text-lg font-semibold text-white font-mono">{s.value}</p><p className="text-[10px] text-white/40">{s.label}</p></div>
            ))}
          </div>
        </div>

        {/* Toggleable: AI Assistant & Work-Study */}
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-emerald-400" />
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">AI Assistant</p>
          </div>
          <button onClick={() => setShowAssistant(!showAssistant)}
            className="w-full rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300 hover:bg-emerald-500/20 transition-colors text-left">
            {showAssistant ? "Hide" : "Ask about your semester"}
          </button>
          {showAssistant && <div className="mt-3"><EduAssistant scope="general" /></div>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-amber-400" />
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Work-Study Balance</p>
          </div>
          <button onClick={() => setShowBalance(!showBalance)}
            className="w-full rounded-lg border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300 hover:bg-amber-500/20 transition-colors text-left">
            {showBalance ? "Hide" : "View weekly workload"}
          </button>
          {showBalance && <div className="mt-3"><WorkStudyBalance /></div>}
        </div>

        {/* Quick Nav Cards */}
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6 lg:col-span-2">
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3">Navigate</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/education/focus", { viewTransition: true })}
              className="flex items-center gap-3 rounded-xl border border-indigo-400/30 bg-black px-4 py-4 text-left text-indigo-300 hover:bg-indigo-500/10 transition-colors">
              <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
              <div><p className="text-sm font-medium text-white">Focus Hub</p><p className="text-[10px] text-white/40">Schedule & timer</p></div>
            </button>
            <button onClick={() => navigate("/education/vault", { viewTransition: true })}
              className="flex items-center gap-3 rounded-xl border border-purple-400/30 bg-black px-4 py-4 text-left text-purple-300 hover:bg-purple-500/10 transition-colors">
              <BookOpen className="h-5 w-5" strokeWidth={1.75} />
              <div><p className="text-sm font-medium text-white">Academic Vault</p><p className="text-[10px] text-white/40">Courses, grades & more</p></div>
            </button>
          </div>
        </div>
      </div>

      <PomodoroTimer open={pomodoroOpen} onOpenChange={setPomodoroOpen} />
    </div>
  );
}