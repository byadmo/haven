import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Target, Flame, BookOpen } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { Button } from "@/components/ui/button";

export default function IdentityHook({ onBegin, theme }) {
  const [leaving, setLeaving] = useState(false);
  const t = THEMES[theme] || THEMES.sunset;

  const handleBegin = () => {
    setLeaving(true);
    setTimeout(() => onBegin(), 400);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 overflow-hidden text-white flex flex-col items-center justify-center p-6 select-none"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${t.surface} 0%, ${t.bg} 50%, #000000 100%)`,
      }}
    >
      {/* Ambient gradient blobs */}
      <div
        className="pointer-events-none absolute -top-32 -left-20 h-96 w-96 rounded-full"
        style={{ background: `radial-gradient(circle, ${t.primary}15, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full"
        style={{ background: `radial-gradient(circle, ${t.secondary}12, transparent 70%)` }}
      />

      <div className="relative z-10 max-w-sm w-full text-center space-y-8">
        {/* Future-self preview card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm p-5 text-left"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] font-mono" style={{ color: t.primary }}>
            Your future self
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Level</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: t.primary }}>12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Best streak</span>
              <span className="text-sm font-semibold text-white flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-orange-400" /> 47 days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Consistency</span>
              <span className="text-sm font-semibold text-emerald-400">89%</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: "72%", background: `linear-gradient(90deg, ${t.primary}, ${t.accent || "#00E5A0"})` }}
              />
            </div>
            <p className="text-[10px] text-white/30 mt-1">Progress to Level 13</p>
          </div>
        </motion.div>

        {/* Value prop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="space-y-3"
        >
          <h1 className="text-2xl font-bold tracking-tight">
            Become the person<br />
            <span style={{ color: t.primary }}>you want to be.</span>
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: t.muted }}>
            Not through willpower alone. Through <span className="text-white font-medium">identity shifts</span> —
            one micro-habit at a time. Most people try to change everything at once.
            We start with who you want to become.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <Button
            onClick={handleBegin}
            className="w-full h-12 text-sm font-semibold rounded-xl shadow-lg shadow-black/30 hover:brightness-110 transition-all"
            style={{ background: t.primary, color: t.tint === "light" ? "#000" : "#000" }}
          >
            Begin Your Transformation
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <button
            onClick={handleBegin}
            className="mt-3 text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            I already have a routine →
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}