import React from "react";
import { base44 } from "@/api/base44Client";
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths,
} from "date-fns";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/finance/DashboardHeader";
import QuickAddModal from "@/components/finance/QuickAddModal";
import MetricsRow from "@/components/finance/MetricsRow";
import CashFlowAnalytics from "@/components/finance/CashFlowAnalytics";
import RecentTransactions from "@/components/finance/RecentTransactions";
import UpcomingRecurring from "@/components/finance/UpcomingRecurring";
import CashBuffer from "@/components/finance/CashBuffer";
import TelemetryReadout from "@/components/finance/TelemetryReadout";
import ScrubbableTimeline from "@/components/finance/ScrubbableTimeline";
import { computeTrajectory } from "@/lib/trajectory";
import { ForecastProvider } from "@/lib/forecast-context";
import LiabilityLedger from "@/components/finance/LiabilityLedger";
import DebtRepaymentGraph from "@/components/finance/DebtRepaymentGraph";
import DebtForm from "@/components/finance/DebtForm";
import DebtModal from "@/components/finance/DebtModal";
import AccountsManager from "@/components/finance/AccountsManager";
import Reveal from "@/components/finance/Reveal";
import { Link } from "react-router-dom";

export default function Home() {
  const [txns, setTxns] = React.useState([]);
  const [debts, setDebts] = React.useState([]);
  const [accounts, setAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [showDebtForm, setShowDebtForm] = React.useState(false);

  const forecastData = React.useMemo(
    () => computeTrajectory({ debts, accounts, transactions: txns }).series,
    [debts, accounts, txns]
  );

  const loadData = React.useCallback(async () => {
    const [t, d, a] = await Promise.all([
      base44.entities.Transaction.list("-date", 500),
      base44.entities.Debt.list("-created_date"),
      base44.entities.Account.list("-created_date"),
    ]);
    setTxns(t);
    setDebts(d);
    setAccounts(a);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // ⌘K quick-add trigger (from command palette when already on Home) + ?add=1 deep link
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
  const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const totalCash = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const netWorth = totalCash - totalDebt;
  const spendRatio = mIncome > 0 ? mExpense / mIncome : (mExpense > 0 ? 1 : 0);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

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
        onClick={() => setShowDebtForm(true)}
        className="bg-indigo-600 text-white hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Liability</span><span className="sm:hidden">Debt</span>
      </Button>
    </>
  );

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">

      <DashboardHeader actions={headerActions} />

      <ForecastProvider forecastData={forecastData}>
      <main className="relative max-w-6xl mx-auto px-6 sm:px-6 py-10 sm:py-6 space-y-10 sm:space-y-6">
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black">
            <TelemetryReadout />
            <ScrubbableTimeline />
          </div>
        </Reveal>

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

        <Reveal><AccountsManager onChanged={() => setRefreshKey((k) => k + 1)} /></Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Reveal><CashFlowAnalytics transactions={txns} /></Reveal>
            <Reveal delay={0.05}>
              <RecentTransactions transactions={txns} accounts={accounts} onChanged={() => setRefreshKey((k) => k + 1)} />
            </Reveal>
          </div>
          <div className="space-y-6">
            <Reveal><CashBuffer accounts={accounts} transactions={txns} /></Reveal>
            <Reveal><UpcomingRecurring transactions={txns} accounts={accounts} onChanged={() => setRefreshKey((k) => k + 1)} /></Reveal>

            <div className="space-y-3">
              <Link to="/strategy" className="group block rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-4 hover:border-indigo-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-100">Debt Strategy</h3>
                    <p className="text-xs text-zinc-500">Projection graph &amp; optimizer</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-indigo-300 transition-colors" />
                </div>
              </Link>
              <Link to="/portfolio" className="group block rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-4 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-100">Stock Portfolio</h3>
                    <p className="text-xs text-zinc-500">Holdings by account</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-300 transition-colors" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        <section>
          <div className="mb-3">
            <h2 className="font-semibold text-sm text-zinc-100">Liability Ledger</h2>
            <p className="text-xs text-zinc-500">Manage your active debts</p>
          </div>
          <div className="space-y-4">
            <Reveal><DebtRepaymentGraph debts={debts} /></Reveal>
            <Reveal><LiabilityLedger debts={debts} onChanged={() => setRefreshKey((k) => k + 1)} /></Reveal>
          </div>
        </section>
      </main>
      </ForecastProvider>

      <QuickAddModal
        open={quickAdd}
        onOpenChange={setQuickAdd}
        accounts={accounts}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />

      <DebtModal
        open={showDebtForm}
        onOpenChange={setShowDebtForm}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}