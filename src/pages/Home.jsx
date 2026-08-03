import React from "react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import {
  startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths,
} from "date-fns";
import { Plus, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/finance/DashboardHeader";
import QuickAddModal from "@/components/finance/QuickAddModal";
import MetricsRow from "@/components/finance/MetricsRow";
import CashFlowAnalytics from "@/components/finance/CashFlowAnalytics";
import RecentTransactions from "@/components/finance/RecentTransactions";
import UpcomingRecurring from "@/components/finance/UpcomingRecurring";
import { computeTrajectory } from "@/lib/trajectory";
import { ForecastProvider } from "@/lib/forecast-context";
import LiabilityLedger from "@/components/finance/LiabilityLedger";
import DebtRepaymentGraph from "@/components/finance/DebtRepaymentGraph";
import DebtForm from "@/components/finance/DebtForm";
import DebtModal from "@/components/finance/DebtModal";
import DebtProgressTracker from "@/components/finance/DebtProgressTracker";
import StatementImportModal from "@/components/finance/StatementImportModal";
import AccountsSummary from "@/components/finance/AccountsSummary";
import Reveal from "@/components/finance/Reveal";

export default function Home() {
  const { transactions: txns, debts, accounts, refresh, refreshKey } = useFinanceData();
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [showDebtForm, setShowDebtForm] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);

  const forecastData = React.useMemo(
    () => computeTrajectory({ debts, accounts, transactions: txns }).series,
    [debts, accounts, txns]
  );

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
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowImport(true)}
        className="border-white/10 text-white/70 hover:text-white hover:border-white/30"
      >
        <UploadCloud className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Import</span>
      </Button>
    </>
  );

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">

      <DashboardHeader actions={headerActions} />

      <ForecastProvider forecastData={forecastData}>
      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-8 sm:space-y-6">
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

        <Reveal><AccountsSummary /></Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Reveal><CashFlowAnalytics transactions={txns} /></Reveal>
            <Reveal delay={0.05}>
              <RecentTransactions transactions={txns} accounts={accounts} debts={debts} refreshKey={refreshKey} onChanged={refresh} />
            </Reveal>
          </div>
          <div className="space-y-6">
            <Reveal><UpcomingRecurring transactions={txns} accounts={accounts} onChanged={refresh} /></Reveal>
          </div>
        </div>

        <section>
          <div className="mb-3">
            <h2 className="font-semibold text-sm text-zinc-100">Liability Ledger</h2>
            <p className="text-xs text-zinc-500">Manage your active debts</p>
          </div>
          <div className="space-y-4">
            <DebtProgressTracker debts={debts} />
            <Reveal><DebtRepaymentGraph debts={debts} /></Reveal>
            <Reveal><LiabilityLedger debts={debts} onChanged={refresh} /></Reveal>
          </div>
        </section>
      </main>
      </ForecastProvider>

      <QuickAddModal
        open={quickAdd}
        onOpenChange={setQuickAdd}
        accounts={accounts}
        debts={debts}
        onSaved={refresh}
      />

      <DebtModal
        open={showDebtForm}
        onOpenChange={setShowDebtForm}
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