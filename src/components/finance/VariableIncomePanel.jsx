import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useCurrency } from "@/lib/currency-context";

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-zinc-100">{value}</span>
    </div>
  );
}

// Variable income adaptation: baseline (3-month min) vs current month, with a
// surplus/stay-the-course verdict. Backed by the adaptVariableIncome function.
export default function VariableIncomePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fmtMoney } = useCurrency();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    base44.functions
      .invoke("adaptVariableIncome", {})
      .then((res) => {
        if (!cancelled) setData(res?.data ?? res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const baseline = data?.baseline_income ?? 0;
  const current = data?.current_month_income ?? 0;
  const footer = data?.surplus_detected
    ? `Surplus of ${fmtMoney(data.surplus)} above baseline — route ${fmtMoney(
        data.allocation?.emergency_buffer || 0
      )} to your buffer and ${fmtMoney(data.allocation?.waterfall_toxic || 0)} toward your highest-cost debt.`
    : "No surplus above baseline this month — stay the course.";

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <h2 className="text-[11px] uppercase tracking-widest text-white/50 mb-4">Variable Income Adaptation</h2>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-white/30" />
        </div>
      ) : (
        <>
          <div>
            <Metric label="Baseline (3mo min)" value={fmtMoney(baseline)} />
            <Metric label="Current month income" value={fmtMoney(current)} />
          </div>
          <p className="mt-4 text-xs text-white/40 leading-relaxed">{footer}</p>
        </>
      )}
    </div>
  );
}