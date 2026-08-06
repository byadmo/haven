import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { base44 } from "@/api/base44Client";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export default function FinancialHealthScore() {
  const { transactions, accounts, debts, currentMonthIncome: mIncome, currentMonthExpenses: mExpense, savingsRate } = useFinanceData();

  const monthlyExpenses = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    let s = 0;
    (transactions || []).forEach((t) => {
      if (t.type !== "expense" || !t.date) return;
      const d = new Date(t.date + "T00:00:00");
      if (d >= cutoff) s += t.amount || 0;
    });
    return s || mExpense || 0;
  }, [transactions, mExpense]);

  const factors = useMemo(() => {
    const cash = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
    const revolving = (debts || []).filter((d) => d.status !== "paid_off" && (d.credit_limit || d.original_balance || 0) > 0);
    const used = revolving.reduce((s, d) => s + (d.current_balance || 0), 0);
    const limit = revolving.reduce((s, d) => s + (d.credit_limit || d.original_balance || 0), 0);
    const util = limit > 0 ? used / limit : 0;
    const creditScore = limit > 0 ? (util <= 0.3 ? 100 : util <= 0.5 ? 65 : util <= 0.7 ? 35 : 12) : 85;

    const emergMonths = monthlyExpenses > 0 ? cash / monthlyExpenses : (cash > 0 ? 99 : 0);
    const emergencyScore = clamp((emergMonths / 3) * 100, 0, 100);

    const minPayments = (debts || []).reduce((s, d) => s + (d.status !== "paid_off" ? (d.minimum_payment || 0) : 0), 0);
    const dti = mIncome > 0 ? minPayments / mIncome : (minPayments > 0 ? 1 : 0);
    const dtiScore = dti <= 0.1 ? 100 : dti <= 0.2 ? 78 : dti <= 0.36 ? 52 : dti <= 0.5 ? 30 : 12;

    const saveRate = savingsRate ?? 0;
    const savingsScore = clamp((saveRate / 20) * 100, 0, 100);

    const billScore = 85;

    return [
      { key: "Emergency buffer", score: emergencyScore, detail: monthlyExpenses > 0 ? `${emergMonths.toFixed(1)} months saved` : "No expense data" },
      { key: "Credit utilization", score: creditScore, detail: limit > 0 ? `${(util * 100).toFixed(0)}% used` : "No revolving debt" },
      { key: "Debt-to-income", score: dtiScore, detail: mIncome > 0 ? `${(dti * 100).toFixed(0)}% DTI` : "No income set" },
      { key: "Savings rate", score: savingsScore, detail: `${saveRate.toFixed(0)}% saved` },
      { key: "On-time bills", score: billScore, detail: "Baseline (not yet tracked)" },
    ];
  }, [accounts, debts, monthlyExpenses, mIncome, savingsRate]);

  const composite = Math.round(factors.reduce((s, f) => s + f.score * 0.2, 0));
  const weakest = factors.slice().sort((a, b) => a.score - b.score)[0];
  const color = composite <= 40 ? "#f87171" : composite <= 70 ? "#fbbf24" : "#34d399";

  const [insight, setInsight] = useState("");
  useEffect(() => {
    let alive = true;
    setInsight("");
    base44.integrations.Core.InvokeLLM({
      prompt: `You are a concise financial coach. The user's weakest financial-health factor is "${weakest.key}" scoring ${Math.round(weakest.score)}/100 (${weakest.detail}). Overall health score is ${composite}/100. Reply with ONE short, actionable sentence (max 18 words) on improving "${weakest.key}". Just the sentence.`,
    }).then((r) => { if (alive) { const txt = typeof r === "string" ? r : (r?.text || r?.content || ""); if (txt) setInsight(txt.trim()); } })
      .catch(() => {});
    return () => { alive = false; };
  }, [weakest.key, weakest.score, weakest.detail, composite]);

  const R = 52, C = 2 * Math.PI * R, off = C * (1 - composite / 100);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Financial Health Score</p>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" className="-rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="64" cy="64" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.6s ease" }} />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-3xl font-bold font-mono tabular-nums" style={{ color }}>{composite}</p>
              <p className="text-[9px] uppercase tracking-widest text-white/40">/ 100</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {factors.map((f) => {
            const fc = f.score <= 40 ? "#f87171" : f.score <= 70 ? "#fbbf24" : "#34d399";
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60 truncate">{f.key}</span>
                  <span className="font-mono tabular-nums shrink-0 ml-2" style={{ color: fc }}>{Math.round(f.score)}</span>
                </div>
                <div className="h-1.5 bg-white/10 overflow-hidden rounded">
                  <div className="h-full rounded" style={{ width: `${f.score}%`, background: fc }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {insight ? (
        <p className="text-[11px] text-white/55 mt-3 leading-snug border-t border-white/5 pt-2">
          <span className="text-emerald-300">Insight:</span> {insight}
        </p>
      ) : (
        <p className="text-[11px] text-white/30 mt-3 border-t border-white/5 pt-2">Analyzing your finances…</p>
      )}
    </div>
  );
}