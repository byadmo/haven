import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { THEMES } from "@/lib/themes";

const LOADING_LINES = [
  { text: "Analyzing your identity...", delay: 0 },
  { text: "Designing your micro-habits...", delay: 1200 },
  { text: "Choosing your anchors...", delay: 2400 },
];

export default function ProcessingAnimation({ theme, onComplete, identityPhrase }) {
  const t = THEMES[theme] || THEMES.sunset;
  const [visibleLine, setVisibleLine] = useState(0);
  const [done, setDone] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Reveal lines sequentially
    const timers = [];
    LOADING_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(() => setVisibleLine(i + 1), line.delay)
      );
    });

    // Show completion
    const completeTimer = setTimeout(() => {
      setDone(true);
    }, 3500);

    // Fade out
    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 4200);

    // Advance
    const advanceTimer = setTimeout(() => {
      onComplete();
    }, 4800);

    return () => {
      timers.forEach((t) => clearTimeout(t));
      clearTimeout(completeTimer);
      clearTimeout(fadeTimer);
      clearTimeout(advanceTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center text-white select-none px-6"
      style={{
        background: `radial-gradient(ellipse at 50% 50%, ${t.surface} 0%, ${t.bg} 50%, #000000 100%)`,
      }}
    >
      {/* Concentric rings */}
      <div className="relative h-40 w-40 mb-10">
        {/* Outer ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${t.primary}15`,
            borderTopColor: t.primary,
            opacity: done ? 0 : 1,
          }}
        />
        {/* Middle ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="absolute inset-2 rounded-full"
          style={{
            border: `2px solid ${t.accent || "#00E5A0"}15`,
            borderTopColor: t.accent || "#00E5A0",
            opacity: done ? 0 : 1,
          }}
        />
        {/* Inner ring */}
        <motion.div
          animate={{ rotate: 360, scale: done ? [1, 1.2, 0] : 1 }}
          transition={{ repeat: done ? 0 : Infinity, duration: 1.5, ease: "linear" }}
          className="absolute inset-5 rounded-full"
          style={{
            border: `2px solid ${t.primary}20`,
            borderTopColor: t.primary,
            opacity: done ? 0 : 1,
          }}
        />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {done ? (
            <motion.span
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-3xl"
            >
              ✨
            </motion.span>
          ) : (
            <div
              className="h-3 w-3 rounded-full animate-pulse"
              style={{ background: t.primary }}
            />
          )}
        </div>
      </div>

      {/* Loading text progression */}
      <div className="text-center space-y-2.5 h-20">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.p
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base font-semibold"
              style={{ color: t.primary }}
            >
              Your blueprint is ready ✨
            </motion.p>
          ) : (
            LOADING_LINES.map(
              (line, i) =>
                i < visibleLine && (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: i === visibleLine - 1 ? 1 : 0.4, y: 0 }}
                    className="text-sm"
                    style={{ color: i === visibleLine - 1 ? "white" : t.muted }}
                  >
                    {line.text}
                  </motion.p>
                )
            )
          )}
        </AnimatePresence>
      </div>

      {/* Identity phrase */}
      {identityPhrase && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          className="text-[11px] text-center mt-8 max-w-xs"
          style={{ color: t.muted }}
        >
          Building a plan for someone who is <span className="text-white/60">{identityPhrase}</span>
        </motion.p>
      )}
    </motion.div>
  );
}