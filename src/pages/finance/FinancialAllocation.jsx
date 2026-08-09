import React, { useMemo } from "react";
import { PieChart, Target, Gauge, TrendingUp } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import BudgetVsActual from "@/components/finance/BudgetVsActual";
import SpendingInsights from "@/components/finance/SpendingInsights";
import FinancialHealthScore from "@/components/finance/FinancialHealthScore";

function formatCurrency(v) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v ?? 0);
}

function sum(arr, key) {
  return arr.reduce((s, r) => s + (r[key] || 0), 0);
}

export default function FinancialAllocation() {
  const { transactions, accounts, categories, goals } = useFinanceData();

  // ── Zero-Based Visualizer ──
  const totalIncome = useMemo(() => {
    const now = new Date();
    const monthly = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return sum(monthly.filter((t) => t.amount > 0), "amount");
  }, [transactions]);

  const totalSpent = useMemo(() => {
    const now = new Date();
    const monthly = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return Math.abs(sum(monthly.filter((t) => t.amount < 0), "amount"));
  }, [transactions]);

  const unassigned = totalIncome - totalSpent;
  const allocationPct = totalIncome > 0 ? Math.min((totalSpent / totalIncome) * 100, 100) : 0;

  // ── Credit Metrics ──
  const totalCreditLimit = useMemo(() => {
    return accounts.filter((a) => a.type === "credit").reduce((s, a) => s + (a.credit_limit || 0), 0);
  }, [accounts]);

  const totalCreditUsed = useMemo(() => {
    return accounts.filter((a) => a.type === "credit").reduce((s, a) => s + Math.abs(a.balance || 0), 0);
  }, [accounts]);

  const creditUtilizationPct = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  const utilizationRing = useMemo(() => {
    const r = 40;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(creditUtilizationPct, 100) / 100) * circ;
    return { circ, offset, r };
  }, [creditUtilizationPct]);

  return (
    <div className="dd-page-enter space-y-6">
      {/* Zero-Based Visualizer */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Zero-Based Allocation</h2>
          <span className="text-xs text-white/40">{totalIncome > 0 ? `${allocationPct.toFixed(0)}% allocated` : "No income data"}</span>
        </div>

        <div className="h-5 rounded-full bg-white/5 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-400 to-purple-400 transition-all duration-500"
            style={{ width: `${allocationPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="text-white/50">Income</p>
            <p className="text-white font-mono tabular-nums mt-0.5">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/50">Spent</p>
            <p className="text-white font-mono tabular-nums mt-0.5">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50">Unassigned</p>
            <p className={`font-mono tabular-nums mt-0.5 ${unassigned >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {formatCurrency(unassigned)}
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Monthly Spend", value: formatCurrency(totalSpent), icon: TrendingUp, color: "text-blue-400" },
          { label: "Top Category", value: categories[0]?.name || "—", icon: PieChart, color: "text-purple-400", sub: categories[0] ? `${((categories[0].total_spent / totalSpent) * 100).toFixed(0)}%` : "" },
          { label: "Credit Usage", value: `${creditUtilizationPct.toFixed(1)}%`, icon: Gauge, color: creditUtilizationPct < 30 ? "text-emerald-400" : creditUtilizationPct < 70 ? "text-amber-400" : "text-red-400" },
          { label: "Active Goals", value: String(goals.length), icon: Target, color: "text-amber-400" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-white/10 bg-black p-4">
              <Icon className={`h-4 w-4 ${m.color} mb-2`} strokeWidth={1.75} />
              <p className="text-lg font-semibold text-white font-mono tabular-nums">{m.value}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{m.label}</p>
              {m.sub && <p className="text-[10px] text-white/20">{m.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Credit Health Ring + Budget Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Credit Utilization Ring */}
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <Gauge className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Credit Health</h2>
          </div>
          <div className="relative h-[120px] w-[120px]">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={utilizationRing.r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={utilizationRing.r} fill="none"
                stroke={creditUtilizationPct < 30 ? "#00E5A0" : creditUtilizationPct < 70 ? "#F59E0B" : "#FF4D4D"}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={utilizationRing.circ}
                strokeDashoffset={utilizationRing.offset}
                style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white font-mono tabular-nums">{creditUtilizationPct.toFixed(0)}%</span>
              <span className="text-[9px] text-white/40 mt-0.5">Utilized</span>
            </div>
          </div>
          <p className="text-xs text-white/50 mt-4 text-center max-w-[200px]">
            {creditUtilizationPct < 15
              ? "Your credit utilization is very low — excellent for your score."
              : creditUtilizationPct < 30
              ? "Your credit utilization is optimal — keep it under 30%."
              : creditUtilizationPct < 70
              ? "Your credit utilization is elevated — try to pay down balances."
              : "Your credit utilization is high — this may impact your score."}
          </p>
          <div className="flex items-center justify-between w-full text-[10px] text-white/30 mt-3">
            <span>Limit: {formatCurrency(totalCreditLimit)}</span>
            <span>Used: {formatCurrency(totalCreditUsed)}</span>
          </div>
        </div>

        {/* Budget Advisor */}
        <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Spending Breakdown</h2>
          <BudgetVsActual transactions={transactions} categories={categories} />
        </div>
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SpendingInsights transactions={transactions} />
        <FinancialHealthScore transactions={transactions} accounts={accounts} />
      </div>
    </div>
  );
}