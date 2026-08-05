import React from "react";
import { ShieldCheck } from "lucide-react";

const STEPS = [
  "Welcome & Profile",
  "Bank Accounts",
  "Recurring Bills",
  "Liabilities & Debts",
  "Investments & Stocks",
];

export default function WizardStepper({ step }) {
  const idx = Math.min(Math.max(step - 1, 0), STEPS.length - 1);
  const pct = Math.round((idx / (STEPS.length - 1)) * 100);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">
            Step {Math.min(step, 5)} of 5
          </p>
          <p className="text-sm font-semibold text-zinc-100 font-mono">{STEPS[idx]}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= idx ? "bg-emerald-500/70" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <div className="h-0.5 -mt-2 mb-1 rounded-full bg-white/5">
        <div className="h-full rounded-full bg-emerald-500/80 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-right text-[10px] text-white/30 font-mono tabular-nums">{pct}%</p>
    </div>
  );
}