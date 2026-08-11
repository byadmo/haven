import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Shield, Flame, Sparkles, X } from "lucide-react";
import { THEMES } from "@/lib/themes";
import { Button } from "@/components/ui/button";

const TOOLTIP_DATA = [
  {
    id: "toggle",
    icon: Check,
    title: "The Toggle",
    body: "Tap the checkmark to complete this habit. That's it. One action, one identity reinforcement.",
    position: "bottom",
    targetLabel: "your first habit",
  },
  {
    id: "safety-net",
    icon: Shield,
    title: "The Safety Net",
    body: "Miss a day? No problem. The system forgives one miss — but two in a row resets your streak. This isn't about perfection. It's about never skipping twice.",
    position: "top",
    targetLabel: "Your streak is protected",
  },
];

export default function DashboardHandoff({ theme, identityPhrase, onDismiss }) {
  const t = THEMES[theme] || THEMES.sunset;
  const [step, setStep] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Auto-advance tooltips
    if (step < TOOLTIP_DATA.length) {
      const timer = setTimeout(() => {
        setStep((s) => s + 1);
      }, 6000);
      return () => clearTimeout(timer);
    } else if (step === TOOLTIP_DATA.length) {
      // Show banner
      setShowBanner(true);
      const bannerTimer = setTimeout(() => {
        setShowBanner(false);
        setDismissed(true);
        onDismiss();
      }, 8000);
      return () => clearTimeout(bannerTimer);
    }
  }, [step, onDismiss]);

  const handleDismissTooltips = () => {
    setStep(TOOLTIP_DATA.length);
    setShowBanner(true);
    const bannerTimer = setTimeout(() => {
      setShowBanner(false);
      setDismissed(true);
      onDismiss();
    }, 8000);
    return () => clearTimeout(bannerTimer);
  };

  if (dismissed) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Tooltip overlays */}
      {step < TOOLTIP_DATA.length && (
        <div className="pointer-events-auto absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10">
          {/* Tooltip card */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${
              TOOLTIP_DATA[step].id === "toggle" ? "top-1/3" : "bottom-1/3"
            }`}
          >
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-zinc-900 border border-white/15 rounded-2xl p-5 shadow-2xl shadow-black/50 max-w-xs"
            >
              <div className="flex items-start gap-3">
                <div
                  className="grid place-items-center rounded-xl h-10 w-10 shrink-0"
                  style={{ background: `${t.primary}20`, borderColor: `${t.primary}40` }}
                >
                  {React.createElement(TOOLTIP_DATA[step].icon, {
                    className: "h-5 w-5",
                    style: { color: t.primary },
                    strokeWidth: 2,
                  })}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{TOOLTIP_DATA[step].title}</h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: t.muted }}>
                    {TOOLTIP_DATA[step].body}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] text-white/30">
                  {step + 1} / {TOOLTIP_DATA.length}
                </span>
                <Button
                  onClick={step === TOOLTIP_DATA.length - 1 ? handleDismissTooltips : () => setStep((s) => s + 1)}
                  className="h-8 px-4 text-[11px] font-medium rounded-lg"
                  style={{ background: t.primary, color: "#000" }}
                >
                  {step === TOOLTIP_DATA.length - 1 ? "Start My Journey" : "Got it →"}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Success banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-sm w-[calc(100%-32px)]"
          >
            <div
              className="rounded-2xl border p-4 shadow-lg"
              style={{
                borderColor: `${t.primary}30`,
                background: `linear-gradient(135deg, ${t.surface} 0%, #000000 100%)`,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="grid place-items-center rounded-xl h-10 w-10 shrink-0"
                  style={{ background: `${t.primary}20` }}
                >
                  <Flame className="h-5 w-5" style={{ color: t.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Day 1 🔥
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: t.muted }}>
                    You're on a <span className="text-amber-300 font-medium">1-day streak</span> of becoming{" "}
                    <span className="text-white font-medium">someone who {identityPhrase}</span>.
                  </p>
                  <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: `${t.primary}80` }}>
                    <Shield className="h-3 w-3" /> Don't skip twice. One miss is fine — two breaks the chain.
                  </p>
                </div>
                <button
                  onClick={() => { setShowBanner(false); setDismissed(true); onDismiss(); }}
                  className="text-white/30 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}