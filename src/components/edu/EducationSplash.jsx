import React, { useState } from "react";
import { GraduationCap, ArrowRight, BookOpen, Timer, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEMES } from "@/lib/themes";

export default function EducationSplash({ onComplete }) {
  const [leaving, setLeaving] = useState(false);
  const t = THEMES.midnight;

  const handleStart = () => {
    setLeaving(true);
    setTimeout(() => onComplete(), 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden text-white flex flex-col items-center justify-center p-6 transition-opacity duration-300 ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ background: `radial-gradient(120% 120% at 50% 0%, ${t.surface} 0%, ${t.bg} 60%, #000000 100%)` }}
    >
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}22, transparent 70%)` }} />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full" style={{ background: `radial-gradient(circle, ${t.secondary}1a, transparent 70%)` }} />

      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center rounded-2xl border h-16 w-16 mb-2" style={{ borderColor: `${t.primary}4d`, background: `${t.primary}1a` }}>
          <GraduationCap className="h-8 w-8" style={{ color: t.primary }} />
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-mono" style={{ color: t.primary }}>Welcome to</span>
          <h1 className="text-3xl font-bold tracking-tight mt-1" style={{ color: t.text }}>Haven <span style={{ color: t.primary }}>Education</span></h1>
          <p className="text-sm mt-2 font-semibold tracking-tight" style={{ color: t.primary }}>Your grades. Accelerated.</p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: t.muted }}>Courses, focus timer, spaced repetition, grades, and analytics — built for engineering students.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-left pt-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <BookOpen className="h-4 w-4 mb-1.5" style={{ color: t.primary }} />
            <p className="text-xs font-semibold text-white">Courses</p>
            <p className="text-[10px] text-white/40 mt-0.5">Track progress</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <Timer className="h-4 w-4 mb-1.5" style={{ color: t.primary }} />
            <p className="text-xs font-semibold text-white">Focus</p>
            <p className="text-[10px] text-white/40 mt-0.5">Flowmodoro</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <Brain className="h-4 w-4 mb-1.5" style={{ color: t.primary }} />
            <p className="text-xs font-semibold text-white">Review</p>
            <p className="text-[10px] text-white/40 mt-0.5">Spaced repetition</p>
          </div>
        </div>

        <Button onClick={handleStart} className="w-full h-12 text-sm font-semibold rounded-xl mt-4 transition-colors" style={{ background: t.primary, color: "#000" }}>
          Enter Education Workspace <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}