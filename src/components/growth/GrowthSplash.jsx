import React, { useState } from "react";
import { Flame, ArrowRight, Target, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GrowthSplash({ onComplete }) {
  const [leaving, setLeaving] = useState(false);

  const handleStart = () => {
    setLeaving(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden bg-black text-white flex flex-col items-center justify-center p-6 transition-opacity duration-300 ${leaving ? "opacity-0" : "opacity-100"}`} style={{ background: "radial-gradient(120% 120% at 50% 0%, #1a0f0a 0%, #0a0503 60%, #000000 100%)" }}>
      {/* Drifting ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12), transparent 70%)" }} />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)" }} />

      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 h-16 w-16 mb-2">
          <Flame className="h-8 w-8 text-amber-400" />
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-mono">Welcome to</span>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Haven Growth</h1>
          <p className="text-sm text-white/60 mt-2 leading-relaxed">
            Optimize your daily routines, build unstoppable streaks, and capture meaningful reflections.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-left pt-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <Target className="h-4 w-4 text-amber-400 mb-1.5" />
            <p className="text-xs font-semibold text-white">Habits</p>
            <p className="text-[10px] text-white/40 mt-0.5">Daily tracking</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <Flame className="h-4 w-4 text-orange-400 mb-1.5" />
            <p className="text-xs font-semibold text-white">Streaks</p>
            <p className="text-[10px] text-white/40 mt-0.5">Compound momentum</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <BookOpen className="h-4 w-4 text-amber-300 mb-1.5" />
            <p className="text-xs font-semibold text-white">Journal</p>
            <p className="text-[10px] text-white/40 mt-0.5">Daily reflections</p>
          </div>
        </div>

        <Button
          onClick={handleStart}
          className="w-full h-12 text-sm font-semibold rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-colors mt-4"
        >
          Enter Growth Workspace <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
