import React from "react";
import PageTitle from "@/components/finance/PageTitle";
import DebtTab from "@/components/dashboard/DebtTab";
import useFinanceShortcuts from "@/lib/useFinanceShortcuts";
import { CreditCard } from "lucide-react";

export default function Debts() {
  const { ShortcutsHelp } = useFinanceShortcuts();

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <PageTitle icon={CreditCard} title="Debts" subtitle="Interest accrual, payoff projection, and strategy comparison" />
        <DebtTab />
      </main>
      {ShortcutsHelp}
    </div>
  );
}