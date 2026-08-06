import React from "react";
import { useSearchParams } from "react-router-dom";
import { Play, Pause, SkipForward, RotateCcw, Bell } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import PageTitle from "@/components/finance/PageTitle";
import AmbientAudio from "@/components/edu/AmbientAudio";
import { useEduSync } from "@/lib/eduSyncContext";

const MODES = [
  { id: "standard", label: "Standard (25/5)", work: 25, brk: 5 },
  { id: "extended", label: "Extended (50/10)", work: 50, brk: 10 },
  { id: "custom", label: "Custom", work: 25, brk: 5 },
];

export default function EduTimer() {
  const { courses, deliverablesByCourse, logStudySession } = useEduSync();
  const [params] = useSearchParams();
  const [modeId, setModeId] = React.useState("standard");
  const [workMin, setWorkMin] = React.useState(25);
  const [brkMin, setBrkMin] = React.useState(5);
  const [phase, setPhase] = React.useState("work"); // work | break
  const [secondsLeft, setSecondsLeft] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [cycle, setCycle] = React.useState(0);
  const CYCLES = 4;

  const [courseId, setCourseId] = React.useState(params.get("course") || "__free__");
  const courseDeliverables = deliverablesByCourse[courses.find((c) => c.id === courseId)?.id] || [];
  const [deliverableId, setDeliverableId] = React.useState(params.get("deliverable") || "__free__");

  const totalForPhase = (phase === "work" ? workMin : brkMin) * 60;

  // Apply mode presets
  React.useEffect(() => {
    const m = MODES.find((x) => x.id === modeId);
    if (modeId !== "custom") { setWorkMin(m.work); setBrkMin(m.brk); }
    // eslint-disable-next-line
  }, [modeId]);

  // When work/break minutes change and not running, reset seconds for current phase
  React.useEffect(() => {
    if (!running) setSecondsLeft((phase === "work" ? workMin : brkMin) * 60);
    // eslint-disable-next-line
  }, [workMin, brkMin]);

  // Tick
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  // Handle reaching zero
  React.useEffect(() => {
    if (secondsLeft > 0) return;
    setRunning(false);
    if (phase === "work") {
      // log session
      logStudySession({
        course_id: courseId === "__free__" ? null : courseId,
        deliverable_id: deliverableId === "__free__" ? null : deliverableId,
        duration_minutes: workMin,
        mode: modeId,
        completed_at: new Date().toISOString(),
      });
      setCycle((c) => c + 1);
      notify("Work session complete — take a break! ☕");
      setPhase("break");
      setSecondsLeft(brkMin * 60);
    } else {
      notify("Break over — back to focus! 📚");
      setPhase("work");
      setSecondsLeft(workMin * 60);
    }
    // eslint-disable-next-line
  }, [secondsLeft]);

  // document.title countdown
  React.useEffect(() => {
    if (running) {
      document.title = `${fmt(secondsLeft)} · ${phase === "work" ? "Focus" : "Break"} · EduSync`;
    } else {
      document.title = "Haven Education";
    }
    return () => { document.title = "Haven Education"; };
  }, [running, secondsLeft, phase]);

  function notify(msg) {
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification("EduSync", { body: msg });
    } catch {}
  }
  function requestNotify() {
    if ("Notification" in window) Notification.requestPermission();
  }

  function start() { setRunning(true); requestNotify(); }
  function pause() { setRunning(false); }
  function skip() {
    setRunning(false);
    setSecondsLeft(0);
  }
  function reset() {
    setRunning(false);
    setPhase("work");
    setSecondsLeft(workMin * 60);
    setCycle(0);
  }

  const pct = totalForPhase > 0 ? (secondsLeft / totalForPhase) * 100 : 0;
  const R = 130, C = 2 * Math.PI * R;

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedDeliv = courseDeliverables.find((d) => d.id === deliverableId);

  return (
    <>
      <EduTopBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageTitle title="Focus Timer" subtitle="Pomodoro study sessions" icon={Play} />

        {/* Mode selector */}
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setModeId(m.id)} className={`px-3 h-9 rounded-md border text-xs transition-colors ${modeId === m.id ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50 hover:text-white"}`}>{m.label}</button>
          ))}
          {modeId === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <Input type="number" min="1" value={workMin} onChange={(e) => setWorkMin(Math.max(1, Number(e.target.value)))} className="w-16 bg-black border-white/10 h-8" />
              <span className="text-[10px] uppercase text-white/40">work</span>
              <Input type="number" min="1" value={brkMin} onChange={(e) => setBrkMin(Math.max(1, Number(e.target.value)))} className="w-16 bg-black border-white/10 h-8" />
              <span className="text-[10px] uppercase text-white/40">break</span>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="rounded-lg border border-white/10 bg-black p-8 flex flex-col items-center">
          <div className="relative grid place-items-center" style={{ width: 300, height: 300 }}>
            <svg width="300" height="300" className="-rotate-90">
              <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle cx="150" cy="150" r={R} fill="none" stroke={phase === "work" ? "#34d399" : "#38bdf8"} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C} style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="absolute text-center">
              <p className="text-5xl font-bold font-mono tabular-nums text-zinc-50">{fmt(secondsLeft)}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{phase === "work" ? "Focus" : "Break"}</p>
            </div>
          </div>

          {/* Task */}
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-zinc-100">{selectedCourse ? selectedCourse.code : "Free Study"}</p>
            <p className="text-[11px] text-white/40 truncate max-w-xs">{selectedDeliv ? selectedDeliv.title : "No specific task"}</p>
          </div>

          {/* Cycle tracker */}
          <div className="mt-3 flex items-center gap-2">
            {Array.from({ length: CYCLES }).map((_, i) => (
              <span key={i} className={`h-2 w-8 rounded-full ${i < cycle ? "bg-emerald-500" : "bg-white/10"}`} />
            ))}
            <span className="text-[10px] uppercase tracking-widest text-white/40 ml-1 font-mono">Cycle {Math.min(cycle + 1, CYCLES)} of {CYCLES}</span>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center gap-2">
            {!running ? (
              <Button onClick={start} className="bg-emerald-500 text-black hover:bg-emerald-400"><Play className="h-4 w-4 mr-1" /> Start</Button>
            ) : (
              <Button onClick={pause} variant="outline" className="border-white/10 text-white/70"><Pause className="h-4 w-4 mr-1" /> Pause</Button>
            )}
            <Button onClick={skip} variant="outline" className="border-white/10 text-white/70"><SkipForward className="h-4 w-4" /> Skip</Button>
            <Button onClick={reset} variant="ghost" className="text-white/50"><RotateCcw className="h-4 w-4" /></Button>
            <Button onClick={requestNotify} variant="ghost" size="icon" className="text-white/40" title="Enable notifications"><Bell className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Task selector */}
        <div className="rounded-lg border border-white/10 bg-black p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Study task</p>
          <div className="grid grid-cols-2 gap-3">
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setDeliverableId("__free__"); }}>
              <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                <SelectItem value="__free__">Free Study</SelectItem>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deliverableId} onValueChange={setDeliverableId} disabled={courseId === "__free__"}>
              <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                <SelectItem value="__free__">No specific task</SelectItem>
                {courseDeliverables.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ambient audio */}
        <div className="rounded-lg border border-white/10 bg-black p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Ambient audio</p>
          <AmbientAudio />
        </div>
      </main>
      <EduBottomNav />
    </>
  );
}

function fmt(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}