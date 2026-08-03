import React from "react";
import { base44 } from "@/api/base44Client";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
  format,
  subWeeks,
} from "date-fns";
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CalendarClock,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DebtTrendChart from "@/components/finance/DebtTrendChart";
import CashFlowChart from "@/components/finance/CashFlowChart";
import TransactionForm from "@/components/finance/TransactionForm";
import DebtForm from "@/components/finance/DebtForm";
import DebtList from "@/components/finance/DebtList";

export default function Home() {
  const [txns, setTxns] = React.useState([]);
  const [debts, setDebts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showTxnForm, setShowTxnForm] = React.useState(false);
  const [showDebtForm, setShowDebtForm] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const [t, d] = await Promise.all([
      base44.entities.Transaction.list("-date", 500),
      base44.entities.Debt.list("-created_date"),
    ]);
    setTxns(t);
    setDebts(d);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const now = new Date();

  // Monthly period
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  let mIncome = 0, mExpense = 0;
  txns.forEach((t) => {
    const d = parseISO(t.date);
    if (isWithinInterval(d, { start: mStart, end: mEnd })) {
      if (t.type === "income") mIncome += t.amount;
      else mExpense += t.amount;
    }
  });
  const mNet = mIncome - mExpense;

  // Weekly period
  const wStart = startOfWeek(now);
  const wEnd = endOfWeek(now);
  let wIncome = 0, wExpense = 0;
  txns.forEach((t) => {
    const d = parseISO(t.date);
    if (isWithinInterval(d, { start: wStart, end: wEnd })) {
      if (t.type === "income") wIncome += t.amount;
      else wExpense += t.amount;
    }
  });
  const wNet = wIncome - wExpense;

  const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const scheduled = txns.filter((t) => t.is_scheduled);
  const upcomingScheduled = scheduled.filter((t) => {
    if (!t.next_date && !t.date) return false;
    const d = parseISO(t.next_date || t.date);
    return d >= now;
  });

  const recentTxns = txns.slice(0, 8);

  const fmt = (v) => `$${Math.round(v).toLocaleString()}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Debt Free Tracker</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">{format(now, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowTxnForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Transaction
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowDebtForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Debt
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 shadow-sm border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="h-4 w-4" /><span className="text-xs font-medium">Total Debt</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{fmt(totalDebt)}</p>
          </Card>

          <Card className="p-4 shadow-sm border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" /><span className="text-xs font-medium">Income (Month)</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{fmt(mIncome)}</p>
          </Card>

          <Card className="p-4 shadow-sm border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-orange-600" /><span className="text-xs font-medium">Expenses (Month)</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{fmt(mExpense)}</p>
          </Card>

          <Card className="p-4 shadow-sm border-border">
            <div className="flex items-center gap-2 mb-1">
              {mNet >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-xs font-medium text-muted-foreground">Net (Month)</span>
            </div>
            <p className={`text-2xl font-bold ${mNet >= 0 ? "text-green-600" : "text-red-600"}`}>
              {mNet >= 0 ? "+" : "-"}{fmt(Math.abs(mNet))}
            </p>
          </Card>
        </div>

        {/* Loss Alerts */}
        {(mNet < 0 || wNet < 0) && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-red-900">You're spending more than you earn</p>
              <p className="text-red-700">
                {mNet < 0 && `Monthly loss: ${fmt(Math.abs(mNet))} — expenses exceed income this month.`}
                {mNet < 0 && wNet < 0 && " "}
                {wNet < 0 && `Weekly loss: ${fmt(Math.abs(wNet))} — you're in the red this week.`}
              </p>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 shadow-sm border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm">Debt Trend</h2>
                <p className="text-xs text-muted-foreground">Total debt over time</p>
              </div>
            </div>
            <DebtTrendChart debts={debts} />
          </Card>

          <Card className="p-5 shadow-sm border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-sm">Cash Flow</h2>
                <p className="text-xs text-muted-foreground">Inflows vs outflows (last 4 months)</p>
              </div>
            </div>
            <CashFlowChart refreshKey={refreshKey} />
          </Card>
        </div>

        {/* Weekly + Monthly breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-5 shadow-sm border-border">
            <h2 className="font-semibold text-sm mb-3">This Week</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Income</span><span className="font-medium text-green-600">{fmt(wIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="font-medium text-orange-600">{fmt(wExpense)}</span></div>
              <div className="flex justify-between pt-2 border-t border-border"><span className="font-semibold">Net</span><span className={`font-bold ${wNet >= 0 ? "text-green-600" : "text-red-600"}`}>{wNet >= 0 ? "+" : "-"}{fmt(Math.abs(wNet))}</span></div>
            </div>
          </Card>

          <Card className="p-5 shadow-sm border-border">
            <h2 className="font-semibold text-sm mb-3">This Month</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Income</span><span className="font-medium text-green-600">{fmt(mIncome)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="font-medium text-orange-600">{fmt(mExpense)}</span></div>
              <div className="flex justify-between pt-2 border-t border-border"><span className="font-semibold">Net</span><span className={`font-bold ${mNet >= 0 ? "text-green-600" : "text-red-600"}`}>{mNet >= 0 ? "+" : "-"}{fmt(Math.abs(mNet))}</span></div>
            </div>
          </Card>
        </div>

        {/* Scheduled Expenses + Debts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 shadow-sm border-border">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Scheduled Expenses</h2>
            </div>
            {upcomingScheduled.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No scheduled expenses yet.</p>
            ) : (
              <div className="space-y-2">
                {upcomingScheduled.map((t) => (
                  <div key={t.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                    <div>
                      <span className="font-medium">{t.description}</span>
                      <span className="text-xs text-muted-foreground ml-2 capitalize">{t.frequency}</span>
                    </div>
                    <span className={`font-medium ${t.type === "income" ? "text-green-600" : "text-orange-600"}`}>
                      {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 shadow-sm border-border">
            <h2 className="font-semibold text-sm mb-3">Your Debts</h2>
            <DebtList debts={debts} onChanged={() => setRefreshKey((k) => k + 1)} />
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-5 shadow-sm border-border">
          <h2 className="font-semibold text-sm mb-3">Recent Transactions</h2>
          {recentTxns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet. Add one to get started.</p>
          ) : (
            <div className="space-y-1">
              {recentTxns.map((t) => (
                <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === "income" ? "bg-green-100" : "bg-orange-100"}`}>
                      {t.type === "income" ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-orange-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.category} · {format(parseISO(t.date), "MMM d")}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-orange-600"}`}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>

      {/* Slide-over forms */}
      {showTxnForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowTxnForm(false)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Add Transaction</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTxnForm(false)}><X className="h-5 w-5" /></Button>
            </div>
            <TransactionForm onSaved={() => { setShowTxnForm(false); setRefreshKey((k) => k + 1); }} />
          </div>
        </div>
      )}

      {showDebtForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDebtForm(false)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Add Debt</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDebtForm(false)}><X className="h-5 w-5" /></Button>
            </div>
            <DebtForm onSaved={() => { setShowDebtForm(false); setRefreshKey((k) => k + 1); }} />
          </div>
        </div>
      )}
    </div>
  );
}