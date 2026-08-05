import React from "react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import AssistantChat from "@/components/assistant/AssistantChat";
import { Sparkles } from "lucide-react";

export default function Assistant() {
  const { accounts, debts, transactions, debtPayments, stocks, categories } = useFinanceData();

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <DashboardHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-4">
          <PageTitle icon={Sparkles} title="Ask Wei" subtitle="Upload a statement or command changes — you approve everything" />
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