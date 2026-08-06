import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import CashFlowAnalytics from "@/components/finance/CashFlowAnalytics";
import CashFlowChart from "@/components/finance/CashFlowChart";
import FundFlows from "@/components/finance/FundFlows";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { Link } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";

export default function CashFlow() {
  const { transactions: txns, accounts, refresh, refreshKey } = useFinanceData();

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />
      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <PageTitle title="Cash Flow" subtitle="Income, expenses, and money movement over time" icon={Activity} />
        </div>

        <Reveal>
          <CashFlowAnalytics transactions={txns} />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal><CashFlowChart refreshKey={refreshKey} /></Reveal>
          <Reveal delay={0.04}><FundFlows transactions={txns} accounts={accounts} onChanged={refresh} /></Reveal>
        </div>
      </main>
    </div>
  );
}