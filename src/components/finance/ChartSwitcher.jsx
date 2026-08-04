import React from "react";
import CashFlowAnalytics from "@/components/finance/CashFlowAnalytics";
import NetWorthChart from "@/components/finance/NetWorthChart";

const TABS = [
  { id: "networth", label: "Total Net Worth" },
  { id: "cashflow", label: "Cash Flow Trends" },
];

export default function ChartSwitcher({ transactions, accounts, debts }) {
  const [tab, setTab] = React.useState("networth");

  return (
    <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-zinc-950/60 border border-zinc-800 rounded-lg p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${
                tab === t.id ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "networth" ? (
        <NetWorthChart transactions={transactions} accounts={accounts} debts={debts} />
      ) : (
        <CashFlowAnalytics transactions={transactions} embedded />
      )}
    </div>
  );
}