import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import StockTracker from "@/components/finance/StockTracker";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase } from "lucide-react";

export default function Portfolio() {
  const { refresh } = useFinanceData();

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />
      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors shrink-0">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <PageTitle title="Portfolio" subtitle="Live holdings, P&L, and account placement across your investment accounts" icon={Briefcase} />
        </div>

        <Reveal>
          <StockTracker onChanged={refresh} />
        </Reveal>
      </main>
    </div>
  );
}