import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Calendar, TrendingUp, CheckCircle2 } from "lucide-react";
import { format, parseISO, differenceInMonths } from "date-fns";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export default function PayoffTarget({ debt, balance }) {
  const [saving, setSaving] = useState(false);

  async function saveDate(value) {
    setSaving(true);
    try {
      await base44.entities.Debt.update(debt.id, {
        target_payoff_date: value || null,
      });
    } finally {
      setSaving(false);
    }
  }

  const hasTarget = !!debt.target_payoff_date && balance > 0.005;

  if (!hasTarget) {
    return (
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Target className="h-3 w-3 text-white/40" />
          <span className="text-[10px] uppercase tracking-widest text-white/50">Payoff Target</span>
        </div>
        <Input
          type="date"
          onChange={(e) => saveDate(e.target.value)}
          className="bg-white/[0.02] border-white/10 text-zinc-300 text-xs font-mono tabular-nums h-8"
        />
      </div>
    );
  }

  const targetDate = parseISO(debt.target_payoff_date);
  const now = new Date();
  const months = differenceInMonths(targetDate, now);

  let info = null;
  if (months <= 0) {
    info = { status: "past", label: "Target date has passed", months: 0 };
  } else {
    const r = (debt.interest_rate || 0) / 100 / 12;
    let requiredMonthly;
    if (r > 0) {
      const factor = Math.pow(1 + r, months);
      requiredMonthly = (balance * r * factor) / (factor - 1);
    } else {
      requiredMonthly = balance / months;
    }
    const minPmt = debt.minimum_payment || 0;
    const extra = Math.max(0, requiredMonthly - minPmt);
    const onTrack = requiredMonthly <= minPmt;
    info = { status: onTrack ? "on_track" : "behind", months, requiredMonthly, extra, minPmt };
  }

  return (
    <div className="mb-3 p-3 border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Target className="h-3 w-3 text-indigo-400" />
          <span className="text-[10px] uppercase tracking-widest text-white/50">Payoff Target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-white/40" />
          <span className="text-[10px] font-mono tabular-nums text-white/40">{format(targetDate, "MMM yyyy")}</span>
        </div>
      </div>

      {info.status === "past" ? (
        <p className="text-xs text-rose-400 font-mono">{info.label}. Update the date in the edit panel.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] uppercase tracking-widest text-white/50">Remaining</span>
            <span className="text-xs font-mono tabular-nums text-zinc-200">{info.months} months</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] uppercase tracking-widest text-white/50">Required</span>
            <span className="text-sm font-mono tabular-nums text-zinc-100">{fmt(info.requiredMonthly)}<span className="text-white/40 text-[10px]">/mo</span></span>
          </div>
          <div className="h-px bg-white/10" />
          {info.status === "on_track" ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-mono tabular-nums text-emerald-400">On track — minimum covers it</span>
            </div>
          ) : (
            <div className="flex justify-between items-baseline">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50">
                <TrendingUp className="h-3 w-3 text-amber-400" /> Extra needed
              </span>
              <span className="text-sm font-bold font-mono tabular-nums text-amber-400">+{fmt(info.extra)}<span className="text-white/40 text-[10px] font-normal">/mo</span></span>
            </div>
          )}
          {saving && <p className="text-[10px] text-white/30 font-mono">Saving...</p>}
        </div>
      )}

      <button
        onClick={() => saveDate("")}
        className="mt-2 text-[10px] uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
      >
        Remove target
      </button>
    </div>
  );
}