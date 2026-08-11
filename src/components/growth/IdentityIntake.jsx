import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { THEMES } from "@/lib/themes";

const IDENTITY_CHIPS = [
  { id: "focus", icon: "🧠", phrase: "I am someone who protects their attention" },
  { id: "fitness", icon: "💪", phrase: "I am someone who wakes up early with purpose" },
  { id: "learning", icon: "📖", phrase: "I am someone who invests in my mind daily" },
  { id: "mindfulness", icon: "🧘", phrase: "I am someone who finds peace in every moment" },
  { id: "finance", icon: "🛡️", phrase: "I am someone who builds financial freedom" },
  { id: "social", icon: "🤝", phrase: "I am someone who deepens every relationship" },
];

const FRICTION_CHIPS = [
  "I scroll social media for 2 hours before bed",
  "I can't find the energy after work",
  "I forget to check in by midday",
  "I start strong but quit by day 5",
  "I don't know where to begin",
  "I'm too hard on myself when I miss a day",
];

const COMMITMENT_OPTIONS = [
  {
    id: "gentle",
    icon: "🌱",
    label: "Gentle Start",
    desc: "1 micro-habit. Identity is built in inches.",
    detail: "1 habit × 30 days = identity reinforced",
  },
  {
    id: "balanced",
    icon: "🔥",
    label: "Balanced Growth",
    desc: "2–3 habits. Steady momentum compounds.",
    detail: "3 habits × 30 days = lifestyle transformed",
  },
  {
    id: "full",
    icon: "⚡",
    label: "Full Commitment",
    desc: "4 habits. You're ready to transform.",
    detail: "4 habits × 30 days = new identity forged",
  },
];

const CYCLING_PLACEHOLDERS = [
  "I am someone who protects their attention",
  "I am someone who wakes up early with purpose",
  "I am someone who invests in my body daily",
  "I am someone who reads 20 pages every day",
  "I am someone who builds meaningful connections",
];

export default function IdentityIntake({ theme, onComplete, initialData }) {
  const t = THEMES[theme] || THEMES.sunset;
  const [step, setStep] = useState(1);
  const [identityText, setIdentityText] = useState(initialData?.identityText || "");
  const [frictionText, setFrictionText] = useState(initialData?.frictionText || "");
  const [commitment, setCommitment] = useState(initialData?.commitment || "balanced");
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef(null);

  // Cycle placeholder examples
  useEffect(() => {
    if (step === 1) {
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % CYCLING_PLACEHOLDERS.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [step]);

  // Auto-focus input on step change
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [step]);

  const totalSteps = 3;
  const stepProgress = `${step} / ${totalSteps}`;

  const canAdvance = () => {
    switch (step) {
      case 1: return identityText.trim().length > 0;
      case 2: return true; // friction is optional
      case 3: return true;
      default: return true;
    }
  };

  const next = () => {
    if (step < totalSteps) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      onComplete({ identityText: identityText.trim(), frictionText: frictionText.trim(), commitment });
    }
  };

  const back = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const handleChipSelect = (phrase) => {
    setIdentityText(phrase);
  };

  const handleFrictionChip = (text) => {
    setFrictionText((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  const containerClass = "max-w-sm mx-auto";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col text-white select-none"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${t.surface} 0%, ${t.bg} 50%, #000000 100%)`,
      }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={back}
            className={`text-[11px] transition-colors ${step > 1 ? "text-white/50 hover:text-white" : "text-transparent pointer-events-none"}`}
          >
            ← Back
          </button>
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">{stepProgress}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i + 1 <= step ? "opacity-100" : "opacity-20"
              }`}
              style={{ background: i + 1 <= step ? t.primary : "rgba(255,255,255,0.1)" }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pt-20 pb-24">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={containerClass}
          >
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">Who do you want to become?</h2>
                  <p className="text-sm mt-2" style={{ color: t.muted }}>
                    Not what you want to do. <span className="text-white/80">Who.</span>{" "}
                    Identity drives behavior, not the other way around.
                  </p>
                </div>

                <div className="relative">
                  <Input
                    ref={inputRef}
                    value={identityText}
                    onChange={(e) => setIdentityText(e.target.value)}
                    placeholder={CYCLING_PLACEHOLDERS[placeholderIndex]}
                    className="bg-black/60 border-white/10 text-white h-12 text-sm placeholder:text-white/25"
                  />
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2.5">
                    Or pick a starting identity
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {IDENTITY_CHIPS.map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => handleChipSelect(chip.phrase)}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/20 p-3 text-left transition-all"
                      >
                        <span className="text-lg">{chip.icon}</span>
                        <span className="text-[11px] text-white/60 leading-tight">{chip.phrase}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">What's in the way?</h2>
                  <p className="text-sm mt-2" style={{ color: t.muted }}>
                    Be honest. No judgment. This helps us design habits that <span className="text-white/80">actually fit your life</span>.
                  </p>
                </div>

                <Textarea
                  ref={inputRef}
                  value={frictionText}
                  onChange={(e) => setFrictionText(e.target.value)}
                  placeholder="Describe the friction — when do you struggle? What derails you?"
                  rows={4}
                  className="bg-black/60 border-white/10 text-white resize-none text-sm placeholder:text-white/25"
                />

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2.5">
                    Common friction points
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {FRICTION_CHIPS.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => handleFrictionChip(text)}
                        className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-[11px] text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                      >
                        {text.length > 40 ? text.slice(0, 40) + "…" : text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white">
                    What pace feels right?
                  </h2>
                  <p className="text-sm mt-2" style={{ color: t.muted }}>
                    For <span className="text-white font-medium">"{identityText.length > 50 ? identityText.slice(0, 50) + "…" : identityText}"</span>
                  </p>
                </div>

                <div className="space-y-2">
                  {COMMITMENT_OPTIONS.map((opt) => {
                    const active = commitment === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCommitment(opt.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-all ${
                          active
                            ? "border-amber-400/40 bg-amber-500/10 shadow-sm"
                            : "border-white/10 bg-black/40 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{opt.icon}</span>
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${active ? "text-white" : "text-white/70"}`}>
                              {opt.label}
                            </p>
                            <p className="text-[11px] text-white/40 mt-0.5">{opt.desc}</p>
                            <p className="text-[10px] mt-1" style={{ color: active ? t.primary : "rgba(255,255,255,0.2)" }}>
                              {opt.detail}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="absolute bottom-0 left-0 right-0 p-6 pb-8">
        <Button
          onClick={next}
          disabled={!canAdvance()}
          className="w-full h-12 text-sm font-semibold rounded-xl disabled:opacity-30 transition-all"
          style={{ background: t.primary, color: "#000" }}
        >
          {step < totalSteps ? (
            <>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </>
          ) : (
            <>
              Generate My Blueprint <Sparkles className="h-4 w-4 ml-1.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}