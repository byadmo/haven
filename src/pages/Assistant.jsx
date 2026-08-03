import React from "react";
import { base44 } from "@/api/base44Client";
import DashboardHeader from "@/components/finance/DashboardHeader";
import AssistantChat from "@/components/assistant/AssistantChat";
import { Sparkles } from "lucide-react";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

export default function Assistant() {
  const [accounts, setAccounts] = React.useState([]);
  const [summary, setSummary] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      base44.entities.Account.list("-created_date"),
      base44.entities.Debt.list("-created_date"),
      base44.entities.Transaction.list("-date", 60),
    ])
      .then(([a, d, t]) => {
        setAccounts(a);
        const cash = a.reduce((s, x) => s + (x.balance || 0), 0);
        const debt = d.reduce((s, x) => s + (x.current_balance || 0), 0);
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        let income = 0, expense = 0;
        (t || []).forEach((x) => {
          const dt = new Date(x.date);
          if (dt.getMonth() === month && dt.getFullYear() === year) {
            if (x.type === "income") income += x.amount || 0;
            else expense += x.amount || 0;
          }
        });
        setSummary(
          `- Total cash (accounts): ${fmt(cash)}\n` +
          `- Total debt: ${fmt(debt)}\n` +
          `- This month income: ${fmt(income)}\n` +
          `- This month expenses: ${fmt(expense)}\n` +
          `- Net this month: ${fmt(income - expense)}`
        );
      })
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
            <p className="text-[10px] uppercase tracking-widest text-white/50">Upload a statement or ask anything</p>
          </div>
        </div>
        <AssistantChat accounts={accounts} summary={summary} />
      </main>
    </div>
  );
}