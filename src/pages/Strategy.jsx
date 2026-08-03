import React from "react";
import { base44 } from "@/api/base44Client";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import DashboardHeader from "@/components/finance/DashboardHeader";
import DebtStrategyEngine from "@/components/finance/DebtStrategyEngine";
import DebtProjectionChart from "@/components/finance/DebtProjectionChart";
import Reveal from "@/components/finance/Reveal";

export default function Strategy() {
  const [debts, setDebts] = React.useState([]);
  const [txns, setTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    Promise.all([
      base44.entities.Debt.list("-created_date"),
      base44.entities.Transaction.list("-date", 500),
    ]).then(([d, t]) => {
      setDebts(d);
      setTxns(t);
      setLoading(false);
    });
  }, [refreshKey]);

  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  let inc = 0, exp = 0;
  txns.forEach((t) => {
    if (isWithinInterval(parseISO(t.date), { start: mStart, end: mEnd })) {
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    }
  });
  const surplus = Math.max(0, inc - exp);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 selection:bg-violet-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      <DashboardHeader actions={
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          Refresh
        </button>
      } />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Reveal>
          <DebtProjectionChart debts={debts} surplus={surplus} />
        </Reveal>
        <Reveal delay={0.05}>
          <DebtStrategyEngine debts={debts} monthlySurplus={surplus} />
        </Reveal>
      </main>
    </div>
  );
}