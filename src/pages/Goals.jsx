import React from "react";
import PageTitle from "@/components/finance/PageTitle";
import GoalsTab from "@/components/dashboard/GoalsTab";
import useFinanceShortcuts from "@/lib/useFinanceShortcuts";
import { Target } from "lucide-react";

export default function Goals() {
  const { ShortcutsHelp } = useFinanceShortcuts();

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <PageTitle icon={Target} title="Goals" subtitle="Track savings, debt-payoff, and investment milestones" />
        <GoalsTab />
      </main>
      {ShortcutsHelp}
    </div>
  );
}