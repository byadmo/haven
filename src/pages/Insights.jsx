import React from "react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { startOfMonth, endOfMonth, subMonths, format, isWithinInterval, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import InsightMetrics from "@/components/finance/InsightMetrics";
import IncomeVsSpendingChart from "@/components/finance/IncomeVsSpendingChart";
import SpendingInsights from "@/components/finance/SpendingInsights";
import InsightsStrategyCompare from "@/components/finance/InsightsStrategyCompare";
import { OverviewSavings, OverviewHeatmap, useOverviewData } from "@/components/dashboard/OverviewTab";

export default function Insights() {
  const { transactions: txns, accounts, debts, stocks, refreshKey } = useFinanceData();
  const [anchor, setAnchor] = React.useState(new Date());
  const { saving } = useOverviewData(refreshKey, { accounts, debts, stocks });

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

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />
      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-8 sm:space-y-6">
        <PageTitle title="Insights" subtitle="Analytics across spending, savings, and debt strategy" />

        <div className="flex items-center justify-between mt-1">
          <p className="text-sm font-mono tracking-tight text-zinc-200">{format(anchor, "MMMM yyyy")}</p>
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

        <Reveal>
          <SpendingInsights
            monthLabel={format(anchor, "MMMM yyyy")}
            start={startOfMonth(anchor)}
            end={endOfMonth(anchor)}
            transactions={txns}
          />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal><OverviewSavings saving={saving} /></Reveal>
          <Reveal delay={0.03}><OverviewHeatmap transactions={txns} /></Reveal>
        </div>

        <Reveal><IncomeVsSpendingChart data={monthlyData} /></Reveal>

        <Reveal><InsightsStrategyCompare /></Reveal>
      </main>
    </div>
  );
}