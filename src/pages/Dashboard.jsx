import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import OverviewTab from "@/components/dashboard/OverviewTab";
import DebtTab from "@/components/dashboard/DebtTab";
import CashFlowTab from "@/components/dashboard/CashFlowTab";
import InvestmentsTab from "@/components/dashboard/InvestmentsTab";
import GoalsTab from "@/components/dashboard/GoalsTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "debt", label: "Debt" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "investments", label: "Investments" },
  { id: "goals", label: "Goals" },
];

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await base44.functions.invoke("detectRecurringTransactions", {}); } catch (e) {}
    setRefreshing(false);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-black text-zinc-100 dd-page-enter">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-emerald-400" /> Financial Command Center</h1>
            <p className="text-xs text-white/40">Live overview of net worth, debt, cash flow, and goals.</p>
          </div>
          <Button onClick={refresh} disabled={refreshing} variant="outline" className="border-white/10 text-white/70 hover:text-white">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${tab === t.id ? "text-emerald-400 border-emerald-400" : "text-white/50 hover:text-white border-transparent"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab refreshKey={refreshKey} />}
        {tab === "debt" && <DebtTab refreshKey={refreshKey} />}
        {tab === "cashflow" && <CashFlowTab refreshKey={refreshKey} />}
        {tab === "investments" && <InvestmentsTab refreshKey={refreshKey} />}
        {tab === "goals" && <GoalsTab refreshKey={refreshKey} />}
      </div>
    </div>
  );
}