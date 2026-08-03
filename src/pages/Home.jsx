import React from "react";
import { base44 } from "@/api/base44Client";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { Plus, X, Wallet, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/finance/DashboardHeader";
import CashFlowAnalytics from "@/components/finance/CashFlowAnalytics";
import LiabilityLedger from "@/components/finance/LiabilityLedger";
import FundFlows from "@/components/finance/FundFlows";
import TransactionForm from "@/components/finance/TransactionForm";
import DebtForm from "@/components/finance/DebtForm";
import AccountsManager from "@/components/finance/AccountsManager";
import Reveal from "@/components/finance/Reveal";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [txns, setTxns] = React.useState([]);
  const [debts, setDebts] = React.useState([]);
  const [accounts, setAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showTxnForm, setShowTxnForm] = React.useState(false);
  const [showDebtForm, setShowDebtForm] = React.useState(false);

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

  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  let mIncome = 0, mExpense = 0;
  txns.forEach((t) => {
    if (isWithinInterval(parseISO(t.date), { start: mStart, end: mEnd })) {
      if (t.type === "income") mIncome += t.amount;
      else mExpense += t.amount;
    }
  });
  const mNet = mIncome - mExpense;
  const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const totalCash = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const fmt = (v) => `$${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  if (loading) {
    return (
      <div className="dark min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  const headerActions = (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowTxnForm(true)}
        className="bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
      >
        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Transaction</span><span className="sm:hidden">Txn</span>
      </Button>
      <Button
        size="sm"
        onClick={() => setShowDebtForm(true)}
        className="bg-zinc-100 text-zinc-900 hover:bg-white"
      >
        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Liability</span><span className="sm:hidden">Debt</span>
      </Button>
    </>
  );

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 selection:bg-violet-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      <DashboardHeader actions={headerActions} />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Wallet className="h-4 w-4" />} label="Total Debt" value={fmt(totalDebt)} accent="rose" />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Cash on Hand" value={fmt(totalCash)} accent="emerald" />
          <StatCard icon={<TrendingDown className="h-4 w-4" />} label="Expenses (Month)" value={fmt(mExpense)} accent="orange" />
          <StatCard
            icon={mNet >= 0 ? <TrendingUp className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            label="Net (Month)"
            value={`${mNet >= 0 ? "+" : "-"}${fmt(Math.abs(mNet))}`}
            accent={mNet >= 0 ? "emerald" : "rose"}
          />
        </Reveal>

        {mNet < 0 && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-rose-200">You're running a loss this month</p>
              <p className="text-rose-300/80 text-xs mt-0.5">
                Expenses exceed income by {fmt(Math.abs(mNet))}. Consider trimming outflows or boosting income to accelerate debt payoff.
              </p>
            </div>
          </div>
        )}

        <Reveal><AccountsManager onChanged={() => setRefreshKey((k) => k + 1)} /></Reveal>

        <section>
          <div className="mb-3">
            <h2 className="font-semibold text-sm text-zinc-100">Liability Ledger</h2>
            <p className="text-xs text-zinc-500">Manage your active debts</p>
          </div>
          <Reveal><LiabilityLedger debts={debts} onChanged={() => setRefreshKey((k) => k + 1)} /></Reveal>
        </section>

        <Reveal><CashFlowAnalytics transactions={txns} /></Reveal>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-zinc-100">Income & Expense Flow</h2>
              <p className="text-xs text-zinc-500">Inflows vs outflows, aligned with tabular numbers</p>
            </div>
          </div>
          <Reveal><FundFlows transactions={txns} accounts={accounts} onChanged={() => setRefreshKey((k) => k + 1)} /></Reveal>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link to="/strategy" className="group rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 hover:border-violet-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100">Debt Strategy & What-If</h3>
                <p className="text-xs text-zinc-500">Projection graph &amp; optimizer</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-violet-300 transition-colors" />
            </div>
          </Link>
          <Link to="/portfolio" className="group rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100">Stock Portfolio</h3>
                <p className="text-xs text-zinc-500">Holdings by account (TFSA, RESP…)</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-300 transition-colors" />
            </div>
          </Link>
        </div>
      </main>

      {showTxnForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTxnForm(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg text-zinc-50">Add Transaction</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTxnForm(false)} className="text-zinc-400 hover:text-zinc-100"><X className="h-5 w-5" /></Button>
            </div>
            <TransactionForm accounts={accounts} onSaved={() => { setShowTxnForm(false); setRefreshKey((k) => k + 1); }} />
          </div>
        </div>
      )}

      {showDebtForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDebtForm(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-lg text-zinc-50">Add Liability</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDebtForm(false)} className="text-zinc-400 hover:text-zinc-100"><X className="h-5 w-5" /></Button>
            </div>
            <DebtForm onSaved={() => { setShowDebtForm(false); setRefreshKey((k) => k + 1); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  const accents = {
    rose: "text-rose-400 bg-rose-500/15",
    emerald: "text-emerald-400 bg-emerald-500/15",
    orange: "text-orange-400 bg-orange-500/15",
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-4 shadow-lg shadow-black/30"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accents[accent] || ""}`}>{icon}</div>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${accent === "emerald" ? "text-emerald-400" : accent === "rose" ? "text-rose-400" : accent === "orange" ? "text-orange-400" : "text-zinc-50"}`}>
        {value}
      </p>
    </motion.div>
  );
}