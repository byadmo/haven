import React from "react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import DashboardHeader from "@/components/finance/DashboardHeader";
import AssistantChat from "@/components/assistant/AssistantChat";
import { Sparkles } from "lucide-react";

export default function Assistant() {
  const { accounts, debts, transactions, debtPayments, stocks, categories } = useFinanceData();

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <DashboardHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 flex items-center justify-center bg-indigo-500/10">
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-50">Finance Assistant</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Upload a statement or command changes — you approve everything</p>
          </div>
        </div>
        <AssistantChat
          accounts={accounts}
          debts={debts}
          transactions={transactions}
          debtPayments={debtPayments}
          stocks={stocks}
          categories={categories}
        />
      </main>
    </div>
  );
}