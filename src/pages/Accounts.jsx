import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import AccountsManager from "@/components/finance/AccountsManager";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { computeTrajectory } from "@/lib/trajectory";
import { ForecastProvider } from "@/lib/forecast-context";
import Reveal from "@/components/finance/Reveal";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Accounts() {
  const { transactions: txns, debts, accounts, refresh } = useFinanceData();

  const forecastData = React.useMemo(
    () => computeTrajectory({ debts, accounts, transactions: txns }).series,
    [debts, accounts, txns]
  );

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />
      <ForecastProvider forecastData={forecastData}>
        <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <div>
              <h1 className="font-semibold text-lg text-zinc-100">Accounts</h1>
              <p className="text-xs text-white/50">Manage all your accounts, investments, and liabilities</p>
            </div>
          </div>
          <Reveal><AccountsManager onChanged={refresh} /></Reveal>
        </main>
      </ForecastProvider>
    </div>
  );
}