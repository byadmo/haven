import React from "react";
import { SelectInput, TextInput } from "../fields";

const RISKS = [
  { value: "conservative", label: "Conservative" },
  { value: "moderate", label: "Moderate" },
  { value: "aggressive", label: "Aggressive" },
  { value: "speculative", label: "Speculative" },
];

export default function Step1Profile({ profile, setProfile }) {
  const set = (patch) => setProfile({ ...profile, ...patch });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 font-mono tracking-tight">
          Welcome to Haven
        </h2>
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          Let's build your financial command center. We'll set up your profile in 5
          quick steps — upload statements and we'll auto-extract your data, or enter
          everything manually.
        </p>
      </header>

      <div className="space-y-4">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">
            Income type
          </span>
          <SelectInput
            value={profile.income_type}
            onChange={(v) => set({ income_type: v })}
            options={[
              { value: "fixed", label: "Fixed Salary" },
              { value: "variable", label: "Variable / Freelance" },
            ]}
          />
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-widest text-white/40 mb-1.5">
            Estimated baseline monthly take-home pay
          </span>
          <TextInput
            value={profile.baseline_monthly_income}
            onChange={(v) => set({ baseline_monthly_income: v })}
            placeholder="e.g. 4500"
          />
        </label>

        <div>
          <span className="block text-[10px] uppercase tracking-widest text-white/40 mb-2">
            Risk preference
          </span>
          <div className="grid grid-cols-2 gap-2">
            {RISKS.map((r) => {
              const active = profile.risk_tolerance === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set({ risk_tolerance: r.value })}
                  className={`rounded-md border px-3 py-2 text-sm font-mono transition-colors text-left ${
                    active
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-black/40 text-zinc-300 hover:border-white/25"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}