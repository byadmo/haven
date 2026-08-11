import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Brain, Coffee, Timer, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSI } from "@/lib/SIContext";
import { useToast } from "@/components/ui/use-toast";

const PRESETS = [
  { label: "15 min", value: 15 },
  { label: "25 min", value: 25 },
  { label: "50 min", value: 50 },
  { label: "90 min", value: 90 },
];

const INITIAL_BREAK = 5;
const LONG_BREAK = 15;
const CYCLES_BEFORE_LONG = 4;

export default function PomodoroTimer({ open, onOpenChange }) {
  const { habits, addFocusSession } = useSI();
  const { toast } = useToast();
  const [sessionLen, setSessionLen] = useState(25);
  const [timeLeft, setTimeLeft] = useState(sessionLen * 60);
  const [state, setState] = useState("idle"); // idle, running, paused, break, done
  const [cycleCount, setCycleCount] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState("");
  const [sessionHistory, setSessionHistory] = useState([]);
  const intervalRef = useRef(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  const totalSeconds = state === "break" ? (cycleCount > 0 && cycleCount % CYCLES_BEFORE_LONG === 0 ? LONG_BREAK : INITIAL_BREAK) * 60 : sessionLen * 60;
  const progress = 1 - timeLeft / totalSeconds;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration) => {
    startRef.current = Date.now();
    elapsedRef.current = 0;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000) + elapsedRef.current;
      const remaining = Math.max(duration * 60 - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        if (state === "break") {
          setState("idle");
          setTimeLeft(sessionLen * 60);
          toast({ title: "Break over!", description: "Ready to focus again?" });
        } else {
          setState("done");
          // Log the completed session
          const completed = { duration_minutes: sessionLen, completed_at: new Date().toISOString(), habit_id: selectedHabit || null };
          setSessionHistory(prev => [completed, ...prev]);
          addFocusSession(completed);
          setCycleCount(c => c + 1);
          toast({ title: "Session complete! 🎉", description: `${sessionLen} min focus session logged.` });
        }
      }
    }, 200);
  }, [clearTimer, sessionLen, state, selectedHabit, addFocusSession, toast]);

  const handleStart = () => {
    setState("running");
    setTimeLeft(sessionLen * 60);
    startTimer(sessionLen);
  };

  const handlePause = () => {
    clearTimer();
    elapsedRef.current += Math.floor((Date.now() - startRef.current) / 1000);
    setState("paused");
  };

  const handleResume = () => {
    setState("running");
    startRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000) + elapsedRef.current;
      const remaining = Math.max(sessionLen * 60 - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        setState("done");
        const completed = { duration_minutes: sessionLen, completed_at: new Date().toISOString(), habit_id: selectedHabit || null };
        setSessionHistory(prev => [completed, ...prev]);
        addFocusSession(completed);
        setCycleCount(c => c + 1);
        toast({ title: "Session complete! 🎉", description: `${sessionLen} min focus session logged.` });
      }
    }, 200);
  };

  const handleStartBreak = () => {
    const breakLen = cycleCount > 0 && cycleCount % CYCLES_BEFORE_LONG === 0 ? LONG_BREAK : INITIAL_BREAK;
    setState("break");
    setTimeLeft(breakLen * 60);
    startTimer(breakLen);
  };

  const handleReset = () => {
    clearTimer();
    setTimeLeft(sessionLen * 60);
    setState("idle");
    elapsedRef.current = 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      clearTimer();
      setTimeLeft(sessionLen * 60);
      setState("idle");
      elapsedRef.current = 0;
    }
  }, [open, clearTimer, sessionLen]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const todaySessions = sessionHistory.filter(s => {
    const d = s.completed_at ? new Date(s.completed_at).toISOString().slice(0, 10) : "";
    return d === new Date().toISOString().slice(0, 10);
  });
  const todayTotalMin = todaySessions.reduce((s, x) => s + x.duration_minutes, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Brain className="h-5 w-5 text-amber-400" />
                Focus Session
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs">
                {todaySessions.length > 0
                  ? `Today: ${todaySessions.length} sessions · ${todayTotalMin}m total`
                  : "No sessions yet today"
                }
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-4 space-y-5">
              {/* Session length selector (idle only) */}
              {state === "idle" && (
                <div className="w-full space-y-3">
                  <div className="flex items-center gap-2 justify-center">
                    {PRESETS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => { setSessionLen(p.value); setTimeLeft(p.value * 60); }}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                          sessionLen === p.value
                            ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                            : "border-white/10 text-white/40 hover:border-white/20"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {/* Habit selector */}
                  {habits.length > 0 && (
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Link to habit (optional)</label>
                      <select
                        value={selectedHabit}
                        onChange={(e) => setSelectedHabit(e.target.value)}
                        className="w-full h-8 rounded-md border border-white/10 bg-black text-xs text-white/70 px-2 outline-none focus:border-amber-400/40"
                      >
                        <option value="">General focus</option>
                        {habits.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Cycle counter */}
                  {cycleCount > 0 && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/30">
                      <Coffee className="h-3 w-3" />
                      Completed {cycleCount} pomodoro{cycleCount > 1 ? "s" : ""} this session
                    </div>
                  )}
                </div>
              )}

              {/* Animated ring */}
              <div className="relative h-40 w-40">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <motion.circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke={state === "break" ? "url(#breakGradient)" : "url(#pomodoroGradient)"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="pomodoroGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00E5A0" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#F97316" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={timeLeft}
                    initial={{ opacity: 0.5, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-mono font-bold tabular-nums text-white"
                  >
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </motion.span>
                  <span className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
                    {state === "done" ? "Complete! 🎉" : state === "break" ? "Break time" : `${sessionLen} min focus`}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                {state === "idle" && (
                  <Button onClick={handleStart} className="bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30 h-10 px-6 rounded-xl">
                    <Play className="h-4 w-4 mr-1.5" /> Start Focus
                  </Button>
                )}
                {state === "running" && (
                  <Button onClick={handlePause} className="bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 h-10 px-6 rounded-xl">
                    <Pause className="h-4 w-4 mr-1.5" /> Pause
                  </Button>
                )}
                {state === "paused" && (
                  <>
                    <Button onClick={handleResume} className="bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30 h-10 px-6 rounded-xl">
                      <Play className="h-4 w-4 mr-1.5" /> Resume
                    </Button>
                    <Button onClick={handleReset} variant="ghost" className="text-white/50 hover:text-white h-10 px-3">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {state === "done" && (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-emerald-300">🎉 Session Complete!</p>
                    <div className="flex gap-2">
                      <Button onClick={handleStartBreak} className="bg-orange-500/20 border border-orange-400/30 text-orange-200 hover:bg-orange-500/30 h-9 px-4 rounded-xl text-xs">
                        <Coffee className="h-3.5 w-3.5 mr-1" /> Take a Break
                      </Button>
                      <Button onClick={handleReset} className="bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30 h-9 px-4 rounded-xl text-xs">
                        <Timer className="h-3.5 w-3.5 mr-1" /> Another
                      </Button>
                    </div>
                  </div>
                )}
                {state === "break" && (
                  <Button onClick={handleReset} variant="ghost" className="text-white/50 hover:text-white h-10 px-3">
                    <RotateCcw className="h-4 w-4 mr-1" /> Skip Break
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}