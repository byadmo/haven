import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import RecentTransactions from "@/components/finance/RecentTransactions";
import TransactionCsvExport from "@/components/finance/TransactionCsvExport";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { Receipt } from "lucide-react";

export default function Transactions() {
  const { transactions, accounts, debts, refresh, refreshKey } = useFinanceData();
  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <PageTitle icon={Receipt} title="Transactions" subtitle="Search, filter, and manage your full transaction history" />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] text-white/40">Search, filter, and edit your transactions — or export your history below.</p>
          <TransactionCsvExport transactions={transactions} />
        </div>
        <RecentTransactions
          transactions={transactions}
          accounts={accounts}
          debts={debts}
          onChanged={refresh}
          refreshKey={refreshKey}
        />
      </main>
    </div>
  );
}