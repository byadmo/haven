import React, { useState } from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import CashFlowAnalytics from "@/components/finance/CashFlowAnalytics";
import CashFlowChart from "@/components/finance/CashFlowChart";
import FundFlows from "@/components/finance/FundFlows";
import CashFlowCalendar from "@/components/finance/CashFlowCalendar";
import CashFlowSnoInsights from "@/components/finance/CashFlowSnoInsights";
import RecurringPanel from "@/components/finance/RecurringPanel";
import VariableIncomePanel from "@/components/finance/VariableIncomePanel";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { Link } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";

export default function CashFlow() {
  const { transactions: txns, accounts, refresh } = useFinanceData();
  const [anchor, setAnchor] = useState(new Date());

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />
      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <PageTitle title="Cash Flow" subtitle="Upcoming recurring payments and balance projections" icon={Activity} />
        </div>

        <Reveal>
          <CashFlowCalendar anchor={anchor} onAnchorChange={setAnchor} />
        </Reveal>

        <Reveal>
          <CashFlowSnoInsights anchor={anchor} />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal><RecurringPanel transactions={txns} onChanged={refresh} /></Reveal>
          <Reveal delay={0.04}><VariableIncomePanel /></Reveal>
        </div>

        <Reveal>
          <CashFlowAnalytics transactions={txns} />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal><CashFlowChart transactions={txns} /></Reveal>
          <Reveal delay={0.04}><FundFlows transactions={txns} accounts={accounts} onChanged={refresh} limit={5} enableViewAll /></Reveal>
        </div>
      </main>
    </div>
  );
}