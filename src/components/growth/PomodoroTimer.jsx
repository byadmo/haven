import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const POMODORO_MIN = 25;
const POMODORO_SEC = POMODORO_MIN * 60;

export default function PomodoroTimer({ open, onOpenChange }) {
  const [state, setState] = useState("idle");
    const [timeLeft, setTimeLeft] = useState(POMODORO_SEC);
    const intervalRef = useRef(null);
    const startRef = useRef(0);
    const elapsedRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    elapsedRef.current = 0;
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000) + elapsedRef.current;
      const remaining = Math.max(POMODORO_SEC - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        setState("done");
        // Play a notification sound (optional)
      }
    }, 200); // Check every 200ms for drift-free precision
  }, [clearTimer]);

  const handleStart = () => {
    setState("running");
    startTimer();
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
      const remaining = Math.max(POMODORO_SEC - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTimer();
        setState("done");
      }
    }, 200);
  };

  const handleReset = () => {
    clearTimer();
    setTimeLeft(POMODORO_SEC);
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
      setTimeLeft(POMODORO_SEC);
      setState("idle");
      elapsedRef.current = 0;
    }
  }, [open, clearTimer]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - timeLeft / POMODORO_SEC;

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
            </DialogHeader>

            <div className="flex flex-col items-center py-6 space-y-6">
              {/* Animated ring */}
              <div className="relative h-44 w-44">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  {/* Background ring */}
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  {/* Progress ring */}
                  <motion.circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="url(#pomodoroGradient)"
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
                  </defs>
                </svg>
                {/* Timer display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    key={timeLeft}
                    initial={{ opacity: 0.5, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-mono font-bold tabular-nums text-white"
                  >
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </motion.span>
                  <span className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
                    {state === "done" ? "Complete!" : `${POMODORO_MIN} min focus`}
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
                      <RotateCcw className="h-4 w-4 mr-1" /> Reset
                    </Button>
                  </>
                )}
                {state === "done" && (
                  <>
                    <div className="text-center">
                      <p className="text-sm text-emerald-300 mb-2">🎉 Session Complete!</p>
                      <Button onClick={handleReset} className="bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30 h-10 px-6 rounded-xl">
                        <RotateCcw className="h-4 w-4 mr-1.5" /> Start Another
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}