import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import DebtTab from "@/components/dashboard/DebtTab";
import { CreditCard } from "lucide-react";

export default function Debts() {
  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <PageTitle icon={CreditCard} title="Debts" subtitle="Interest accrual, payoff projection, and strategy comparison" />
        <DebtTab />
      </main>
    </div>
  );
}