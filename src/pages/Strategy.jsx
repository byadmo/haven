import React from "react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import DashboardHeader from "@/components/finance/DashboardHeader";
import DebtStrategyEngine from "@/components/finance/DebtStrategyEngine";
import DebtProjectionChart from "@/components/finance/DebtProjectionChart";
import GoalPlanner from "@/components/finance/GoalPlanner";
import StrategyAdvisor from "@/components/finance/StrategyAdvisor";
import Reveal from "@/components/finance/Reveal";

export default function Strategy() {
  const { debts, accounts, transactions: txns, refresh } = useFinanceData();
  const [goalExtra, setGoalExtra] = React.useState(0);

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

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader actions={
        <button
          onClick={refresh}
          className="border border-white/10 bg-black px-3 py-1.5 text-xs uppercase tracking-widest text-zinc-300 hover:border-white/30 hover:text-white transition-colors duration-150"
        >
          Refresh
        </button>
      } />

      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-8 sm:space-y-6">
        <Reveal>
          <StrategyAdvisor debts={debts} accounts={accounts} transactions={txns} surplus={surplus} />
        </Reveal>
        <Reveal delay={0.03}>
          <DebtProjectionChart debts={debts} surplus={surplus} />
        </Reveal>
        <Reveal delay={0.05}>
          <GoalPlanner
            debts={debts}
            accounts={accounts}
            transactions={txns}
            method="avalanche"
            months={120}
            currentExtra={goalExtra}
            onApply={(e) => setGoalExtra(e)}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <DebtStrategyEngine debts={debts} monthlySurplus={surplus} />
        </Reveal>
      </main>
    </div>
  );
}