import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, CalendarClock, Plus, Target, Gauge, PieChart, BarChart3, Activity, Timer, Sparkles } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import UpcomingRecurring from "@/components/finance/UpcomingRecurring";
import QuickAddModal from "@/components/finance/QuickAddModal";
import IncomeVsSpendingChart from "@/components/finance/IncomeVsSpendingChart";
import ForecastCharts from "@/components/finance/ForecastCharts";
import FundFlows from "@/components/finance/FundFlows";
import CashFlowAnalytics from "@/components/finance/CashFlowAnalytics";
import PomodoroTimer from "@/components/growth/PomodoroTimer";
import AskAI from "@/components/finance/AskAI";
import useFinanceShortcuts from "@/lib/useFinanceShortcuts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { relativeDate } from "@/lib/formatDates";

function formatCurrency(v) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v ?? 0);
}

function sum(arr, key) {
  return arr.reduce((s, r) => s + (r[key] || 0), 0);
}

export default function FinancialDashboard() {
  const { transactions, accounts, debts, refresh } = useFinanceData();
  const navigate = useNavigate();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const { ShortcutsHelp } = useFinanceShortcuts();

  const totalAssets = useMemo(() => sum(accounts, "balance"), [accounts]);
  const totalDebts = useMemo(() => sum(debts, "balance"), [debts]);
  const netLiquidity = totalAssets - totalDebts;

  const thisMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    return transactions.filter((t) => t.date >= start && t.date < end);
  }, [transactions]);

  const incomeTotal = useMemo(() => sum(thisMonth.filter((t) => t.amount > 0), "amount"), [thisMonth]);
  const expenseTotal = useMemo(() => sum(thisMonth.filter((t) => t.amount < 0), "amount"), [thisMonth]);
  const cashflow = incomeTotal + expenseTotal;

  const forecast30 = useMemo(() => {
    const avgIncome = incomeTotal / (new Date().getDate() || 1);
    const avgExpense = Math.abs(expenseTotal) / (new Date().getDate() || 1);
    return netLiquidity + (avgIncome - avgExpense) * 30;
  }, [incomeTotal, expenseTotal, netLiquidity]);

  // Spendable Today: net liquidity minus upcoming bills in the next 14 days
  const spendableToday = useMemo(() => {
    const now = new Date();
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const upcomingBills = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= now && d <= new Date(twoWeeks) && t.amount < 0;
    });
    const totalUpcoming = sum(upcomingBills, "amount");
    return netLiquidity + totalUpcoming; // totalUpcoming is negative, so this subtracts
  }, [transactions, netLiquidity]);

  // Daily burn rate
  const daysElapsed = new Date().getDate();
  const dailyBurn = daysElapsed > 0 ? Math.abs(expenseTotal) / daysElapsed : 0;
  const projectedMonthEnd = dailyBurn * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  // Next upcoming bill
  const nextBill = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => t.amount < 0 && new Date(t.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  }, [transactions]);

  const staggerVariants = {
      hidden: { opacity: 0, y: 20 },
      show: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
      }),
    };

    const containerVariants = {
      hidden: {},
      show: { transition: { staggerChildren: 0.05 } },
    };

    return (
      <div className="dd-page-enter space-y-6">
        {/* Hero Bar */}
        <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Command Center</p>
            <div className="flex items-center gap-2">
              <AskAI path="/overview" />
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <CalendarClock className="h-3 w-3" />
                {new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-4 gap-4"
                >
                  <motion.div variants={staggerVariants} custom={0}>
            <p className="text-xs text-white/50 mb-1">Net Liquidity</p>
            <p className={`text-3xl sm:text-4xl font-semibold tracking-tight font-mono tabular-nums ${netLiquidity >= 0 ? "text-emerald-300" : "text-red-400"}`}>
              {formatCurrency(netLiquidity)}
            </p>
          </motion.div>
                    {/* Spendable Today */}
          <motion.div variants={staggerVariants} custom={1} className="border-l border-white/10 pl-4 sm:pl-6">
                      <p className="text-xs text-white/50 mb-1">Spendable Today</p>
                      <p className={`text-2xl sm:text-3xl font-semibold tracking-tight font-mono tabular-nums ${spendableToday >= 0 ? "text-blue-300" : "text-amber-400"}`}>
                        {formatCurrency(spendableToday)}
                      </p>
                      <p className="text-[10px] text-white/40 mt-0.5">After upcoming bills</p>
                    </motion.div>
                    <motion.div variants={staggerVariants} custom={2} className="border-l border-white/10 pl-4 sm:pl-6">
                      <p className="text-xs text-white/50 mb-1">Monthly Cash Flow</p>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-mono">{formatCurrency(incomeTotal)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-red-300 font-mono">{formatCurrency(Math.abs(expenseTotal))}</span>
                        </div>
                      </div>
                      <p className={`text-xs mt-1 font-mono ${cashflow >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {cashflow >= 0 ? "+" : ""}{formatCurrency(cashflow)} net
                      </p>
                    </motion.div>
                    <motion.div variants={staggerVariants} custom={3} className="border-l border-white/10 pl-4 sm:pl-6">
                      <p className="text-xs text-white/50 mb-1">30-Day Forecast</p>
                      <button onClick={() => setShowForecast(true)} className="w-full text-left">
                        <p className={`text-2xl font-semibold font-mono ${forecast30 >= 0 ? "text-emerald-300" : "text-red-400"}`}>
                          {formatCurrency(forecast30)}
                        </p>
                        <div className="h-1.5 rounded-full bg-white/5 mt-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${forecast30 >= 0 ? "bg-gradient-to-r from-emerald-500 to-blue-400" : "bg-gradient-to-r from-red-500 to-orange-400"}`}
                            style={{ width: `${Math.min(Math.abs(forecast30 / totalAssets) * 100 || 0, 100)}%` }} />
                        </div>
                      </button>
                    </motion.div>
                  </motion.div>

        {/* Daily burn + next bill row */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/40">Daily burn:</span>
            <span className="font-mono text-white/70">{formatCurrency(dailyBurn)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/40">Projected month-end:</span>
            <span className={`font-mono ${projectedMonthEnd <= Math.abs(expenseTotal) * 1.1 ? "text-emerald-300" : "text-amber-300"}`}>{formatCurrency(projectedMonthEnd)}</span>
          </div>
          {nextBill && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/40">Next bill:</span>
              <span className="font-mono text-white/70">{formatCurrency(Math.abs(nextBill.amount))}</span>
              <span className="text-white/40">{relativeDate(nextBill.date)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expandable Chart Section */}
      <div className="rounded-2xl border border-white/10 bg-black overflow-hidden">
        <button onClick={() => setShowChart(!showChart)} className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Income vs Spending</h2>
          </div>
          <span className="text-xs text-white/40">{showChart ? "Collapse" : "Expand"}</span>
        </button>
        {showChart && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-6">
            <IncomeVsSpendingChart data={transactions} />
            <FundFlows transactions={transactions} />
          </div>
        )}
      </div>

      {/* Upcoming & Recurring */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Upcoming & Recurring</h2>
          <button onClick={() => setQuickAddOpen(true)} className="flex items-center gap-1.5 text-[11px] text-emerald-300 hover:text-emerald-200 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Transaction
          </button>
        </div>
        <UpcomingRecurring transactions={transactions} accounts={accounts} onChanged={refresh} />
      </div>

      {/* Cash Flow Analytics */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold text-white">Cash Flow Analytics</h2>
        </div>
        <CashFlowAnalytics transactions={transactions} />
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Allocation", icon: PieChart, to: "/allocation", color: "emerald" },
          { label: "Goals", icon: Target, to: "/goals", color: "blue" },
          { label: "Credit Health", icon: Gauge, to: "/credit-utilization", color: "purple" },
          { label: "Quick Add", icon: Plus, onClick: () => setQuickAddOpen(true), color: "amber" },
          { label: "Focus", icon: Timer, onClick: () => setPomodoroOpen(true), color: "indigo" },
          { label: "Ask AI", icon: Sparkles, to: "/assistant?prompt=What%27s%20my%20financial%20health%20summary%20this%20month%3F", color: "emerald" },
        ].map((b) => {
          const colorMap = { emerald: "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10", blue: "border-blue-400/30 text-blue-300 hover:bg-blue-500/10", purple: "border-purple-400/30 text-purple-300 hover:bg-purple-500/10", amber: "border-amber-400/30 text-amber-300 hover:bg-amber-500/10", indigo: "border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/10" };
          const Icon = b.icon;
          return (
            <button key={b.label} onClick={() => b.onClick ? b.onClick() : navigate(b.to, { viewTransition: true })}
              className={`flex items-center gap-2.5 rounded-xl border bg-black px-4 py-3.5 text-left text-sm font-medium transition-colors ${colorMap[b.color]}`}>
              <Icon className="h-4 w-4" strokeWidth={1.75} /> {b.label}
            </button>
          );
        })}
      </div>

      {/* Forecast Modal */}
      <Dialog open={showForecast} onOpenChange={setShowForecast}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Forecast Projections</DialogTitle>
          </DialogHeader>
          <ForecastCharts transactions={transactions} />
        </DialogContent>
      </Dialog>

      <QuickAddModal open={quickAddOpen} onOpenChange={setQuickAddOpen} onAdded={refresh} />
      <PomodoroTimer open={pomodoroOpen} onOpenChange={setPomodoroOpen} />

      {ShortcutsHelp}
    </div>
  );
}