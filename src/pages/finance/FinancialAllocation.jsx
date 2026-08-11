import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PieChart, Target, Gauge, TrendingUp, Briefcase, BarChart3, DollarSign, PiggyBank, ShoppingCart, Tags, Repeat, FileBarChart } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import BudgetVsActual from "@/components/finance/BudgetVsActual";
import BudgetAdvisor from "@/components/finance/BudgetAdvisor";
import SpendingInsights from "@/components/finance/SpendingInsights";
import FinancialHealthScore from "@/components/finance/FinancialHealthScore";
import GoalPlanner from "@/components/finance/GoalPlanner";
import StockAdvisor from "@/components/finance/StockAdvisor";
import AskAI from "@/components/finance/AskAI";
import IncomeTagManager from "@/components/finance/IncomeTagManager";
import SubscriptionManager from "@/components/finance/SubscriptionManager";
import CustomReportEngine from "@/components/finance/CustomReportEngine";
import useFinanceShortcuts from "@/lib/useFinanceShortcuts";

function formatCurrency(v) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v ?? 0);
}

function sum(arr, key) {
  return arr.reduce((s, r) => s + (r[key] || 0), 0);
}

function IncomeTagSection() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <IncomeTagManager />
      </div>
    </div>
  );
}

function SubscriptionsSection() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <SubscriptionManager />
      </div>
    </div>
  );
}

function ReportsSection() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <CustomReportEngine />
      </div>
    </div>
  );
}

export default function FinancialAllocation() {
  const { transactions, accounts, categories, goals, debts } = useFinanceData();
  const { ShortcutsHelp } = useFinanceShortcuts();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const [showBudgetRule, setShowBudgetRule] = useState(false);
  const [showIncomeTags, setShowIncomeTags] = useState(false);
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [activeSection, setActiveSection] = useState(tab === "reports" ? "reports" : "allocation");

  // Scroll to section based on query param
  React.useEffect(() => {
    if (tab === "goals") {
      setTimeout(() => document.getElementById("section-goals")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } else if (tab === "credit") {
      setTimeout(() => document.getElementById("section-credit")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [tab]);

  const totalIncome = useMemo(() => {
    const now = new Date();
    return sum(transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.amount > 0;
    }), "amount");
  }, [transactions]);

  const totalSpent = useMemo(() => {
    const now = new Date();
    return Math.abs(sum(transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.amount < 0;
    }), "amount"));
  }, [transactions]);

  const unassigned = totalIncome - totalSpent;
  const allocationPct = totalIncome > 0 ? Math.min((totalSpent / totalIncome) * 100, 100) : 0;

  const totalCreditLimit = useMemo(() => accounts.filter((a) => a.type === "credit").reduce((s, a) => s + (a.credit_limit || 0), 0), [accounts]);
  const totalCreditUsed = useMemo(() => accounts.filter((a) => a.type === "credit").reduce((s, a) => s + Math.abs(a.balance || 0), 0), [accounts]);
  const creditUtilizationPct = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  // 50/30/20 breakdown
  const budgetRule = useMemo(() => {
    if (totalIncome <= 0) return null;
    const needsCategories = ["rent", "mortgage", "utilities", "groceries", "transport", "insurance", "health", "childcare", "phone", "internet"];
    const savingsCategories = ["savings", "investment", "debt_payoff", "emergency", "retirement"];

    let needs = 0, wants = 0, savings = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const monthTxns = transactions.filter((t) => t.date >= monthStart && t.date < monthEnd && t.amount < 0);

    monthTxns.forEach((t) => {
      const cat = (t.category || "").toLowerCase();
      const amt = Math.abs(t.amount);
      if (savingsCategories.some((s) => cat.includes(s))) {
        savings += amt;
      } else if (needsCategories.some((s) => cat.includes(s))) {
        needs += amt;
      } else {
        wants += amt;
      }
    });

    return { needs, wants, savings, needsPct: (needs / totalIncome) * 100, wantsPct: (wants / totalIncome) * 100, savingsPct: (savings / totalIncome) * 100, total: totalIncome };
  }, [transactions, totalIncome]);

  return (
    <div className="dd-page-enter space-y-6">
      {/* Section Tabs */}
      <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-xl p-1 border border-white/5">
        {[
          { id: "allocation", label: "Allocation", icon: PieChart },
          { id: "income-tags", label: "Income Tags", icon: Tags },
          { id: "subscriptions", label: "Subscriptions", icon: Repeat },
          { id: "reports", label: "Reports", icon: FileBarChart },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-400/30"
                  : "text-white/40 hover:text-white border border-transparent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              {s.label}
            </button>
          );
        })}
      </div>

      {activeSection === "allocation" && (
        <>
          {/* Zero-Based Visualizer */}
          <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Zero-Based Allocation</h2>
              <div className="flex items-center gap-2">
                <AskAI path="/allocation" />
                {budgetRule && (
                  <button
                    onClick={() => setShowBudgetRule((o) => !o)}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                      showBudgetRule ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    50/30/20
                  </button>
                )}
                <span className="text-xs text-white/40">{totalIncome > 0 ? `${allocationPct.toFixed(0)}% allocated` : "No income data"}</span>
              </div>
            </div>
            <div className="h-5 rounded-full bg-white/5 overflow-hidden mb-3">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-400 to-purple-400 transition-all duration-500" style={{ width: `${allocationPct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div><p className="text-white/50">Income</p><p className="text-white font-mono mt-0.5">{formatCurrency(totalIncome)}</p></div>
              <div className="text-center"><p className="text-white/50">Spent</p><p className="text-white font-mono mt-0.5">{formatCurrency(totalSpent)}</p></div>
              <div className="text-right"><p className="text-white/50">Unassigned</p><p className={`font-mono mt-0.5 ${unassigned >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatCurrency(unassigned)}</p></div>
            </div>

            {/* 50/30/20 Overlay */}
            {showBudgetRule && budgetRule && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">50/30/20 Budget Rule</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Needs", pct: budgetRule.needsPct, target: 50, value: budgetRule.needs, icon: ShoppingCart, color: "blue" },
                    { label: "Wants", pct: budgetRule.wantsPct, target: 30, value: budgetRule.wants, icon: DollarSign, color: "amber" },
                    { label: "Savings", pct: budgetRule.savingsPct, target: 20, value: budgetRule.savings, icon: PiggyBank, color: "emerald" },
                  ].map((r) => {
                    const diff = r.pct - r.target;
                    const isOver = diff > 0;
                    const colorMap = {
                      blue: { text: "text-blue-300", bar: "bg-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/5" },
                      amber: { text: "text-amber-300", bar: "bg-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/5" },
                      emerald: { text: "text-emerald-300", bar: "bg-emerald-500", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
                    };
                    const c = colorMap[r.color];
                    const Icon = r.icon;
                    return (
                      <div key={r.label} className={`rounded-lg border p-3 ${r.border} ${r.bg}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 ${c.text}`} />
                            <span className={`text-xs font-semibold ${c.text}`}>{r.label}</span>
                          </div>
                          <span className={`text-[10px] font-mono ${isOver ? "text-rose-400" : "text-emerald-400"}`}>
                            {r.pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                          <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.min(100, r.pct)}%` }} />
                          <div className="absolute top-0 bottom-0 w-0.5 bg-white/40" style={{ left: `${r.target}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-white/40">{formatCurrency(r.value)}</span>
                          <span className={isOver ? "text-rose-400" : "text-emerald-400"}>
                            {isOver ? `+${diff.toFixed(0)}% over` : `${Math.abs(diff).toFixed(0)}% under`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] text-white/30 mt-2">Goal: 50% Needs · 30% Wants · 20% Savings. Target markers shown as vertical lines.</p>
              </div>
            )}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Monthly Spend", value: formatCurrency(totalSpent), icon: TrendingUp, color: "text-blue-400" },
              { label: "Top Category", value: categories[0]?.name || "—", icon: PieChart, color: "text-purple-400" },
              { label: "Credit Usage", value: `${creditUtilizationPct.toFixed(1)}%`, icon: Gauge, color: creditUtilizationPct < 30 ? "text-emerald-400" : creditUtilizationPct < 70 ? "text-amber-400" : "text-red-400" },
              { label: "Active Goals", value: String(goals.length), icon: Target, color: "text-amber-400" },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="rounded-xl border border-white/10 bg-black p-4">
                  <Icon className={`h-4 w-4 ${m.color} mb-2`} strokeWidth={1.75} />
                  <p className="text-lg font-semibold text-white font-mono tabular-nums">{m.value}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{m.label}</p>
                </div>
              );
            })}
          </div>

          {/* Budget + Credit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div id="section-credit" className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-white">Credit Health</h2>
              </div>
              <div className="relative h-[120px] w-[120px]">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke={creditUtilizationPct < 30 ? "#00E5A0" : creditUtilizationPct < 70 ? "#F59E0B" : "#FF4D4D"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - Math.min(creditUtilizationPct, 100) / 100)}
                    style={{ transition: "stroke-dashoffset 0.6s ease-out" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-white font-mono tabular-nums">{creditUtilizationPct.toFixed(0)}%</span>
                  <span className="text-[9px] text-white/40 mt-0.5">Utilized</span>
                </div>
              </div>
              <div className="flex items-center justify-between w-full text-[10px] text-white/30 mt-3">
                <span>Limit: {formatCurrency(totalCreditLimit)}</span>
                <span>Used: {formatCurrency(totalCreditUsed)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-white mb-4">Spending Breakdown</h2>
              <BudgetVsActual transactions={transactions} categories={categories} />
            </div>
          </div>

          {/* Budget Advisor AI */}
          <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Budget AI Insights</h2>
            </div>
            <BudgetAdvisor transactions={transactions} categories={categories} />
          </div>

          {/* Spending + Health Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SpendingInsights transactions={transactions} />
            <FinancialHealthScore transactions={transactions} accounts={accounts} />
          </div>

          {/* Goal Planner */}
          <div id="section-goals" className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Goal Planner</h2>
            </div>
            <GoalPlanner transactions={transactions} goals={goals} />
          </div>

          {/* Investment Portfolio */}
          <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Investment Portfolio</h2>
            </div>
            <StockAdvisor />
          </div>
        </>
      )}

      {activeSection === "income-tags" && <IncomeTagSection />}
      {activeSection === "subscriptions" && <SubscriptionsSection />}
      {activeSection === "reports" && <ReportsSection />}

      {ShortcutsHelp}
    </div>
  );
}