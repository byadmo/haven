import React from "react";
import { useSearchParams } from "react-router-dom";
import { Play, Pause, SkipForward, RotateCcw, Bell, Coffee } from "lucide-react";
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
  { id: "flowmodoro", label: "Flowmodoro" },
  { id: "custom", label: "Custom" },
];

export default function EduTimer() {
  const { courses, deliverablesByCourse, logStudySession } = useEduSync();
  const [params] = useSearchParams();
  const [modeId, setModeId] = React.useState("flowmodoro");
  const [customMin, setCustomMin] = React.useState(60);

  const [phase, setPhase] = React.useState("study"); // study | break
  const [studySeconds, setStudySeconds] = React.useState(0); // counts up
  const [breakSecondsLeft, setBreakSecondsLeft] = React.useState(0); // counts down
  const [breakTotal, setBreakTotal] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const [blockLogged, setBlockLogged] = React.useState(false);
  const [cycle, setCycle] = React.useState(0);

  const [courseId, setCourseId] = React.useState(params.get("course") || "__free__");
  const [deliverableId, setDeliverableId] = React.useState(params.get("deliverable") || "__free__");
  React.useEffect(() => {
    if (params.get("course")) setCourseId(params.get("course"));
    if (params.get("deliverable")) setDeliverableId(params.get("deliverable"));
  }, [params]);

  const courseDeliverables = deliverablesByCourse[courses.find((c) => c.id === courseId)?.id] || [];

  // Tick
  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (phase === "study") setStudySeconds((s) => s + 1);
      else setBreakSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [running, phase]);

  // Break ends → auto-start a new study session
  React.useEffect(() => {
    if (phase !== "break" || breakSecondsLeft > 0) return;
    setPhase("study");
    setStudySeconds(0);
    setBreakSecondsLeft(0);
    setBlockLogged(false);
    setCycle((c) => c + 1);
    notify("Break over — new focus session started 📚");
    // eslint-disable-next-line
  }, [phase, breakSecondsLeft]);

  // Custom target reached
  React.useEffect(() => {
    if (modeId === "custom" && phase === "study" && running && customMin > 0 && studySeconds === customMin * 60) {
      notify(`Target reached — ${customMin}m studied. Take a break when ready.`);
    }
    // eslint-disable-next-line
  }, [studySeconds]);

  // Tab title
  React.useEffect(() => {
    if (running) {
      if (phase === "study") document.title = `${fmt(studySeconds)} · Focus · EduSync`;
      else document.title = `${fmt(breakSecondsLeft)} · Break · EduSync`;
    } else {
      document.title = "Haven Education";
    }
    return () => { document.title = "Haven Education"; };
  }, [running, studySeconds, breakSecondsLeft, phase]);

  function endStudy() {
    if (blockLogged || studySeconds < 10) return;
    const minutes = Math.max(1, Math.round(studySeconds / 60));
    logStudySession({
      course_id: courseId === "__free__" ? null : courseId,
      deliverable_id: deliverableId === "__free__" ? null : deliverableId,
      duration_minutes: minutes,
      mode: modeId,
      completed_at: new Date().toISOString(),
    });
    setBlockLogged(true);
  }

  function takeBreak() {
    if (phase !== "study" || studySeconds < 10) return;
    endStudy();
    const brkSec = Math.max(60, Math.round(studySeconds / 5)); // 1/5th of study (min 1 min)
    setBreakTotal(brkSec);
    setBreakSecondsLeft(brkSec);
    setPhase("break");
    setRunning(true);
    notify(`Break started — ${fmt(brkSec)} to recharge ☕`);
  }

  function requestNotify() { if ("Notification" in window) Notification.requestPermission(); }
  function notify(msg) { try { if ("Notification" in window && Notification.permission === "granted") new Notification("EduSync", { body: msg }); } catch {} }
  function start() { setRunning(true); requestNotify(); }
  function pause() { setRunning(false); }
  function skip() {
    if (phase === "study") {
      if (studySeconds >= 10) takeBreak();
      else { setRunning(false); setPhase("break"); setBreakSecondsLeft(0); }
    } else {
      // skip remaining break → new study
      setPhase("study"); setStudySeconds(0); setBreakSecondsLeft(0); setBlockLogged(false);
      setCycle((c) => c + 1);
    }
  }
  function reset() {
    if (phase === "study" && studySeconds >= 10 && !blockLogged) endStudy();
    setRunning(false);
    setPhase("study");
    setStudySeconds(0);
    setBreakSecondsLeft(0);
    setBreakTotal(0);
    setBlockLogged(false);
  }

  const R = 130, C = 2 * Math.PI * R;
  const isBreak = phase === "break";
  const total = isBreak ? breakTotal : (modeId === "custom" ? customMin * 60 : 0);
  const display = isBreak ? breakSecondsLeft : studySeconds;
  const pct = total > 0 ? Math.min(100, (isBreak ? breakSecondsLeft / total : studySeconds / total) * 100) : 0;
  const strokeOffset = total > 0 ? C - (pct / 100) * C : 0;
  const ringColor = isBreak ? "#38bdf8" : (phase === "study" && !running && studySeconds === 0 ? "#34d399" : "#34d399");

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedDeliv = courseDeliverables.find((d) => d.id === deliverableId);

  return (
    <>
      <EduTopBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageTitle title="Focus Timer" subtitle="Flowmodoro — study freely, break = 1/5" icon={Play} />

        {/* Mode selector */}
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setModeId(m.id)} className={`px-3 h-9 rounded-md border text-xs transition-colors ${modeId === m.id ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50 hover:text-white"}`}>{m.label}</button>
          ))}
          {modeId === "custom" && (
            <div className="flex items-center gap-2 ml-1">
              <Input type="number" min="1" value={customMin} onChange={(e) => setCustomMin(Math.max(1, Number(e.target.value)))} className="w-20 bg-black border-white/10 h-8" />
              <span className="text-[10px] uppercase text-white/40">min target</span>
            </div>
          )}
          {modeId === "flowmodoro" && (
            <span className="text-[10px] uppercase tracking-widest text-white/40 ml-1">No preset · break = 20% of study</span>
          )}
        </div>

        {/* Timer */}
        <div className="rounded-lg border border-white/10 bg-black p-8 flex flex-col items-center">
          <div className="relative grid place-items-center" style={{ width: 300, height: 300 }}>
            <svg width="300" height="300" className="-rotate-90">
              <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle cx="150" cy="150" r={R} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={strokeOffset} style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div className="absolute text-center">
              <p className="text-5xl font-bold font-mono tabular-nums text-zinc-50">{fmt(display)}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1">{isBreak ? "Break" : "Focus"}</p>
              {!isBreak && studySeconds > 0 && (
                <p className="text-[10px] text-white/30 mt-0.5 font-mono">break will be {fmt(Math.max(60, Math.round(studySeconds / 5)))}</p>
              )}
            </div>
          </div>

          {/* Task */}
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-zinc-100">{selectedCourse ? selectedCourse.code : "Free Study"}</p>
            <p className="text-[11px] text-white/40 truncate max-w-xs">{selectedDeliv ? selectedDeliv.title : "No specific task"}</p>
          </div>

          {/* Cycle tracker */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Sessions {cycle}</span>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center gap-2 flex-wrap justify-center">
            {!running ? (
              <Button onClick={start} className="bg-emerald-500 text-black hover:bg-emerald-400"><Play className="h-4 w-4 mr-1" /> Start</Button>
            ) : (
              <Button onClick={pause} variant="outline" className="border-white/10 text-white/70"><Pause className="h-4 w-4 mr-1" /> Pause</Button>
            )}
            {phase === "study" && (
              <Button onClick={takeBreak} variant="outline" className="border-sky-400/30 text-sky-300 hover:bg-sky-500/10" disabled={studySeconds < 10}>
                <Coffee className="h-4 w-4 mr-1" /> Take Break
              </Button>
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
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}