import React, { useState, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, UploadCloud, RefreshCw } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/finance/DashboardHeader";
import QuickAddModal from "@/components/finance/QuickAddModal";
import StatementImportModal from "@/components/finance/StatementImportModal";
import MetricsRow from "@/components/finance/MetricsRow";
import ChartSwitcher from "@/components/finance/ChartSwitcher";
import RecentTransactions from "@/components/finance/RecentTransactions";
import UpcomingRecurring from "@/components/finance/UpcomingRecurring";
import AccountsSummary from "@/components/finance/AccountsSummary";
import Reveal from "@/components/finance/Reveal";
import { ForecastProvider } from "@/lib/forecast-context";
import { computeTrajectory } from "@/lib/trajectory";
import {
  useOverviewData,
  OverviewKpis,
  OverviewSavings,
  OverviewHeatmap,
  OverviewAlerts,
} from "@/components/dashboard/OverviewTab";
import DebtTab from "@/components/dashboard/DebtTab";
import CashFlowTab from "@/components/dashboard/CashFlowTab";
import InvestmentsTab from "@/components/dashboard/InvestmentsTab";
import GoalsTab from "@/components/dashboard/GoalsTab";
import { useFinanceData } from "@/lib/FinanceDataContext";

// The Overview analytics now live permanently above the tab bar, so the tab
// rail surfaces the specialized command-center views only.
const TABS = [
  { id: "debt", label: "Debt" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "investments", label: "Investments" },
  { id: "goals", label: "Goals" },
];

export default function Dashboard() {
  const { transactions: txns, debts, accounts, refresh, refreshKey } = useFinanceData();
  const [tab, setTab] = useState("debt");
  const [quickAdd, setQuickAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { net, saving, heat, alerts } = useOverviewData(refreshKey);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await base44.functions.invoke("detectRecurringTransactions", {}); } catch (e) {}
    setRefreshing(false);
    refresh();
  }, [refresh]);

  // ⌘K quick-add trigger from the command palette + ?add=1 deep link
  React.useEffect(() => {
    function open() { setQuickAdd(true); }
    window.addEventListener("dd:quickadd", open);
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "1") {
      setQuickAdd(true);
      params.delete("add");
      const qs = params.toString();
      window.history.replaceState({}, "", qs ? `/?${qs}` : "/");
    }
    return () => window.removeEventListener("dd:quickadd", open);
  }, []);

  // Monthly income/expense rollups for the top overview section
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const pStart = startOfMonth(subMonths(now, 1));
  const pEnd = endOfMonth(subMonths(now, 1));
  const inRange = (date, s, e) => isWithinInterval(parseISO(date), { start: s, end: e });
  let mIncome = 0, mExpense = 0, pIncome = 0, pExpense = 0;
  txns.forEach((t) => {
    if (inRange(t.date, mStart, mEnd)) { t.type === "income" ? (mIncome += t.amount) : (mExpense += t.amount); }
    else if (inRange(t.date, pStart, pEnd)) { t.type === "income" ? (pIncome += t.amount) : (pExpense += t.amount); }
  });
  const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
  const netWorth = (net ? net.total : null) ?? (accounts.reduce((s, a) => s + (a.balance || 0), 0) - debts.reduce((s, d) => s + (d.current_balance || 0), 0));
  const spendRatio = mIncome > 0 ? mExpense / mIncome : (mExpense > 0 ? 1 : 0);
  const forecastData = useMemo(
    () => computeTrajectory({ debts, accounts, transactions: txns }).series,
    [debts, accounts, txns]
  );

  const headerActions = (
    <>
      <Button
        size="sm"
        onClick={() => setQuickAdd(true)}
        className="bg-indigo-600 text-white hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Transaction</span><span className="sm:hidden">Add</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowImport(true)}
        className="border-white/10 text-white/70 hover:text-white hover:border-white/30"
      >
        <UploadCloud className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Import</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={doRefresh}
        disabled={refreshing}
        className="border-white/10 text-white/70 hover:text-white"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
      </Button>
    </>
  );

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader actions={headerActions} />

      <ForecastProvider forecastData={forecastData}>
        <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 sm:space-y-6">
          {/* Row 1 — headline metrics (Net Worth · Monthly Income · Monthly Spend) */}
          <Reveal>
            <MetricsRow
              netWorth={netWorth}
              income={mIncome}
              expense={mExpense}
              incomePct={pct(mIncome, pIncome)}
              expensePct={pct(mExpense, pExpense)}
              spendRatio={spendRatio}
            />
          </Reveal>

          {/* Row 2 — balance-sheet KPIs (Cash · Investments · Debt) */}
          <Reveal delay={0.02}><OverviewKpis net={net} /></Reveal>

          {/* Row 3 — accounts ledger */}
          <Reveal delay={0.04}><AccountsSummary /></Reveal>

          {/* Row 4 — chart + upcoming recurring */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Reveal><ChartSwitcher transactions={txns} accounts={accounts} debts={debts} /></Reveal>
            </div>
            <div className="space-y-6">
              <Reveal><UpcomingRecurring transactions={txns} accounts={accounts} onChanged={refresh} /></Reveal>
            </div>
          </div>

          {/* Row 5 — savings rate + spending heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal><OverviewSavings saving={saving} /></Reveal>
            <Reveal delay={0.03}><OverviewHeatmap heat={heat} /></Reveal>
          </div>

          {/* Row 6 — recent transactions */}
          <Reveal delay={0.05}>
            <RecentTransactions transactions={txns} accounts={accounts} debts={debts} refreshKey={refreshKey} onChanged={refresh} />
          </Reveal>

          {/* Row 7 — account balance alerts (footer) */}
          <Reveal><OverviewAlerts alerts={alerts} /></Reveal>

          {/* Tabbed command center */}
          <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${tab === t.id ? "text-emerald-400 border-emerald-400" : "text-white/50 hover:text-white border-transparent"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "debt" && <DebtTab refreshKey={refreshKey} />}
          {tab === "cashflow" && <CashFlowTab refreshKey={refreshKey} />}
          {tab === "investments" && <InvestmentsTab refreshKey={refreshKey} />}
          {tab === "goals" && <GoalsTab refreshKey={refreshKey} />}
        </main>
      </ForecastProvider>

      <QuickAddModal
        open={quickAdd}
        onOpenChange={setQuickAdd}
        accounts={accounts}
        debts={debts}
        onSaved={refresh}
      />

      <StatementImportModal
        open={showImport}
        onOpenChange={setShowImport}
        accounts={accounts}
        debts={debts}
        onSaved={refresh}
      />
    </div>
  );
}