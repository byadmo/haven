import React from "react";
import { base44 } from "@/api/base44Client";
import { startOfMonth, endOfMonth, subMonths, format, isWithinInterval, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import Reveal from "@/components/finance/Reveal";
import InsightMetrics from "@/components/finance/InsightMetrics";
import IncomeVsSpendingChart from "@/components/finance/IncomeVsSpendingChart";
import CategoryBreakdownChart from "@/components/finance/CategoryBreakdownChart";

export default function Insights() {
  const [txns, setTxns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [anchor, setAnchor] = React.useState(new Date());

  React.useEffect(() => {
    base44.entities.Transaction.list("-date", 1000).then(setTxns).finally(() => setLoading(false));
  }, []);

  const months = React.useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(anchor, i);
      arr.push({ label: format(d, "MMM"), start: startOfMonth(d), end: endOfMonth(d) });
    }
    return arr;
  }, [anchor]);

  const monthlyData = React.useMemo(() => months.map((m) => {
    let income = 0, spending = 0;
    txns.forEach((t) => {
      if (!t.date) return;
      try {
        if (isWithinInterval(parseISO(t.date), { start: m.start, end: m.end })) {
          if (t.type === "income") income += t.amount; else spending += t.amount;
        }
      } catch { /* skip bad dates */ }
    });
    return { label: m.label, income, spending, savings: income - spending };
  }), [months, txns]);

  const current = monthlyData[monthlyData.length - 1] || { income: 0, spending: 0, savings: 0 };
  const savingsRate = current.income > 0 ? (current.savings / current.income) * 100 : 0;

  const categoryData = React.useMemo(() => {
    const m = months[months.length - 1];
    const map = {};
    txns.forEach((t) => {
      if (!t.date) return;
      try {
        if (isWithinInterval(parseISO(t.date), { start: m.start, end: m.end }) && t.type !== "income") {
          const cat = t.category || "Uncategorized";
          map[cat] = (map[cat] || 0) + t.amount;
        }
      } catch { /* skip */ }
    });
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [months, txns]);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs uppercase tracking-widest text-white/50">Monthly Insights</h2>
            <p className="text-lg font-semibold font-mono tracking-tight text-zinc-100 mt-1">{format(anchor, "MMMM yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAnchor((a) => subMonths(a, 1))} className="h-8 w-8 rounded-lg border border-white/10 bg-black flex items-center justify-center text-zinc-300 hover:border-white/30 hover:text-white transition-colors duration-150" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => setAnchor(new Date())} className="px-3 h-8 rounded-lg border border-white/10 bg-black text-xs uppercase tracking-widest text-zinc-300 hover:border-white/30 hover:text-white transition-colors duration-150">This Month</button>
            <button onClick={() => setAnchor((a) => subMonths(a, -1))} className="h-8 w-8 rounded-lg border border-white/10 bg-black flex items-center justify-center text-zinc-300 hover:border-white/30 hover:text-white transition-colors duration-150" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Reveal>
          <InsightMetrics income={current.income} spending={current.spending} savings={current.savings} savingsRate={savingsRate} />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal><IncomeVsSpendingChart data={monthlyData} /></Reveal>
          <Reveal delay={0.05}><CategoryBreakdownChart data={categoryData} monthLabel={format(anchor, "MMM yyyy")} /></Reveal>
        </div>
      </main>
    </div>
  );
}