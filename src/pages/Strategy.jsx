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
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader actions={
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="border border-white/10 bg-black px-3 py-1.5 text-xs uppercase tracking-widest text-zinc-300 hover:border-white/30 hover:text-white transition-colors duration-150"
        >
          Refresh
        </button>
      } />

      <main className="relative max-w-6xl mx-auto px-6 sm:px-6 py-10 sm:py-6 space-y-10 sm:space-y-6">
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