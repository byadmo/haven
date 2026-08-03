import React from "react";
import { base44 } from "@/api/base44Client";
import DashboardHeader from "@/components/finance/DashboardHeader";
import AssistantChat from "@/components/assistant/AssistantChat";
import { Sparkles } from "lucide-react";

export default function Assistant() {
  const [data, setData] = React.useState({
    accounts: [],
    debts: [],
    transactions: [],
    debtPayments: [],
    stocks: [],
    categories: [],
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      base44.entities.Account.list("-created_date"),
      base44.entities.Debt.list("-created_date"),
      base44.entities.Transaction.list("-date", 500),
      base44.entities.DebtPayment.list("-date", 200),
      base44.entities.Stock.list("-created_date"),
      base44.entities.Category.list("-created_date"),
    ])
      .then(([accounts, debts, transactions, debtPayments, stocks, categories]) =>
        setData({ accounts, debts, transactions, debtPayments, stocks, categories })
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

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
          accounts={data.accounts}
          debts={data.debts}
          transactions={data.transactions}
          debtPayments={data.debtPayments}
          stocks={data.stocks}
          categories={data.categories}
        />
      </main>
    </div>
  );
}