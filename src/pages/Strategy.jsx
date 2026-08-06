import React from "react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { base44 } from "@/api/base44Client";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import DebtStrategyEngine from "@/components/finance/DebtStrategyEngine";
import DebtProjectionChart from "@/components/finance/DebtProjectionChart";
import GoalPlanner from "@/components/finance/GoalPlanner";
import StrategyAdvisor from "@/components/finance/StrategyAdvisor";
import Reveal from "@/components/finance/Reveal";
import DebtTab from "@/components/dashboard/DebtTab";
import { activeLiabilities } from "@/lib/netWorth";

export default function Strategy() {
  const { debts, accounts, transactions: txns, refresh } = useFinanceData();
  // Override objects carry a nonce so re-applying the same value still
  // re-triggers the engine's effect and resets a slider the user moved.
  const [surplusOverride, setSurplusOverride] = React.useState(null);
  const [methodOverride, setMethodOverride] = React.useState(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  let inc = 0, exp = 0;
  txns.forEach((t) => {
    if (isWithinInterval(parseISO(t.date), { start: mStart, end: mEnd })) {
      if (t.type === "income") inc += t.amount; else exp += t.amount;
    }
  });
  const surplus = Math.max(0, inc - exp);

  // BUG 1/2 — feed payoff simulations deduped, active debts so duplicates and
  // paid-off records never inflate projections. (The liability ledger / tab
  // still uses the raw list for management.)
  const simDebts = activeLiabilities(debts);

  function applySurplus(value) { setSurplusOverride({ value, nonce: Date.now() }); }
  function applyMethod(value) { setMethodOverride({ value, nonce: Date.now() }); }

  // Goal apply moves the Debt Strategy Engine's monthly-surplus slider to the
  // calculated extra, and writes the payoff date onto each active liability.
  async function handleApplyGoal(extra, dateIso) {
    applySurplus(extra);
    if (dateIso) {
      await Promise.all(
        debts
          .filter((d) => (d.current_balance || 0) > 0)
          .map((d) => base44.entities.Debt.update(d.id, { target_payoff_date: dateIso }).catch(() => {}))
      );
      refresh();
    }
  }

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader actions={
        <button
          onClick={() => { refresh(); setRefreshKey((k) => k + 1); }}
          className="border border-white/10 bg-black px-3 py-1.5 text-xs uppercase tracking-widest text-zinc-300 hover:border-white/30 hover:text-white transition-colors duration-150"
        >
          Refresh
        </button>
      } />

      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-8 sm:space-y-6">
        <Reveal><PageTitle title="Debt Strategy" subtitle="Simulate payoff plans and hit your debt-free date sooner" /></Reveal>
        <Reveal>
          <StrategyAdvisor
            debts={simDebts}
            accounts={accounts}
            transactions={txns}
            surplus={surplus}
            onApplyRecommendations={({ surplus: s, method }) => {
              if (typeof s === "number") applySurplus(s);
              if (method) applyMethod(method);
            }}
          />
        </Reveal>
        <Reveal delay={0.03}>
          <DebtProjectionChart debts={simDebts} surplus={surplus} />
        </Reveal>
        <Reveal delay={0.05}>
          <GoalPlanner
            debts={simDebts}
            accounts={accounts}
            transactions={txns}
            method="avalanche"
            months={120}
            onApply={handleApplyGoal}
          />
        </Reveal>
        <Reveal delay={0.05}>
          <DebtStrategyEngine
            debts={simDebts}
            monthlySurplus={surplus}
            forcedSurplus={surplusOverride}
            forcedMethod={methodOverride}
          />
        </Reveal>
        <Reveal delay={0.07}>
          <DebtTab refreshKey={refreshKey} />
        </Reveal>
      </main>
    </div>
  );
}