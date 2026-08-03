import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Check } from "lucide-react";
import Reveal from "@/components/finance/Reveal";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const MILESTONES = [25, 50, 75, 100];

function celebrate(milestone) {
  if (typeof confetti !== "function") return;
  const burst = milestone === 100 ? 180 : 110;
  confetti({ particleCount: burst, spread: 70, origin: { y: 0.7 } });
  setTimeout(
    () => confetti({ particleCount: burst, spread: 80, startVelocity: 38, angle: 60, origin: { x: 0, y: 0.85 } }),
    140
  );
  setTimeout(
    () => confetti({ particleCount: burst, spread: 80, startVelocity: 38, angle: 120, origin: { x: 1, y: 0.85 } }),
    280
  );
}

export default function DebtProgressTracker({ debts }) {
  const original = debts.reduce((s, d) => s + (d.original_balance || d.current_balance || 0), 0);
  const current = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const paid = Math.max(0, original - current);
  const pct = original > 0 ? Math.min(100, (paid / original) * 100) : 0;

  const prevMilestone = React.useRef(-1);
  React.useEffect(() => {
    let highest = -1;
    for (const m of MILESTONES) if (pct >= m) highest = m;
    if (highest > prevMilestone.current) celebrate(highest);
    prevMilestone.current = highest;
  }, [pct]);

  if (original <= 0) return null;

  const nextMilestone = MILESTONES.find((m) => pct < m);
  const toNext = nextMilestone ? original * (nextMilestone / 100) - paid : 0;

  return (
    <Reveal>
      <section className="rounded-lg border border-white/10 bg-black p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-white/50">Debt Freedom Progress</h2>
            <p className="mt-1 text-2xl font-mono tnum text-emerald-400">{pct.toFixed(1)}% paid off</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 tnum">{fmt(paid)} paid of {fmt(original)}</p>
            <p className="text-xs text-emerald-400/70 tnum mt-0.5">{fmt(current)} remaining</p>
          </div>
        </div>

        {/* milestone labels */}
        <div className="relative h-5 mb-1">
          {MILESTONES.map((m) => {
            const reached = pct >= m;
            return (
              <div key={m} className="absolute -translate-x-1/2 flex items-center gap-1" style={{ left: `${m}%` }}>
                {reached ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="grid place-items-center h-4 w-4 rounded-full bg-emerald-500 text-black">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-[10px] font-mono">{m}%</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-white/40">
                    <span className="h-2 w-2 rounded-full border border-white/30" />
                    <span className="text-[10px] font-mono">{m}%</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* progress bar */}
        <div className="relative h-4 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 18 }}
          />
          {MILESTONES.slice(0, 3).map((m) => (
            <div key={m} className="absolute inset-y-0 w-px bg-black/40" style={{ left: `${m}%` }} />
          ))}
        </div>

        {/* next-milestone hint */}
        <div className="mt-3 h-5">
          <AnimatePresence mode="wait">
            {pct >= 100 ? (
              <motion.p
                key="done"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-mono text-emerald-400"
              >
                Debt-free. Every milestone reached.
              </motion.p>
            ) : nextMilestone ? (
              <motion.p
                key={nextMilestone}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-mono text-white/50 tnum"
              >
                {fmt(toNext)} to the {nextMilestone}% milestone
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </Reveal>
  );
}