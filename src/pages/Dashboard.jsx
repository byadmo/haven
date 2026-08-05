import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, UploadCloud, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardHeader from "@/components/finance/DashboardHeader";
import QuickAddModal from "@/components/finance/QuickAddModal";
import StatementImportModal from "@/components/finance/StatementImportModal";
import OverviewTab from "@/components/dashboard/OverviewTab";
import DebtTab from "@/components/dashboard/DebtTab";
import CashFlowTab from "@/components/dashboard/CashFlowTab";
import InvestmentsTab from "@/components/dashboard/InvestmentsTab";
import GoalsTab from "@/components/dashboard/GoalsTab";
import { useFinanceData } from "@/lib/FinanceDataContext";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "debt", label: "Debt" },
  { id: "cashflow", label: "Cash Flow" },
  { id: "investments", label: "Investments" },
  { id: "goals", label: "Goals" },
];

export default function Dashboard() {
  const { accounts, debts, refresh, refreshKey } = useFinanceData();
  const [tab, setTab] = useState("overview");
  const [quickAdd, setQuickAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const doRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await base44.functions.invoke("detectRecurringTransactions", {}); } catch (e) {}
    setRefreshing(false);
    refresh();
  }, [refresh]);

  // ⌘K quick-add trigger from the command palette
  React.useEffect(() => {
    function open() { setQuickAdd(true); }
    window.addEventListener("dd:quickadd", open);
    return () => window.removeEventListener("dd:quickadd", open);
  }, []);

  const headerActions = (
    <>
      <Button
        size="sm"
        onClick={() => setQuickAdd(true)}
        className="bg-indigo-600 text-white hover:bg-indigo-500"
      >
        <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Transaction</span><span className="sm:hidden">Add</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowImport(true)}
        className="border-white/10 text-white/70 hover:text-white hover:border-white/30"
      >
        <UploadCloud className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Import</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={doRefresh}
        disabled={refreshing}
        className="border-white/10 text-white/70 hover:text-white"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
      </Button>
    </>
  );

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader actions={headerActions} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-1 mb-6 border-b border-white/10 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${tab === t.id ? "text-emerald-400 border-emerald-400" : "text-white/50 hover:text-white border-transparent"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab refreshKey={refreshKey} />}
        {tab === "debt" && <DebtTab refreshKey={refreshKey} />}
        {tab === "cashflow" && <CashFlowTab refreshKey={refreshKey} />}
        {tab === "investments" && <InvestmentsTab refreshKey={refreshKey} />}
        {tab === "goals" && <GoalsTab refreshKey={refreshKey} />}
      </main>

      <QuickAddModal
        open={quickAdd}
        onOpenChange={setQuickAdd}
        accounts={accounts}
        debts={debts}
        onSaved={refresh}
      />

      <StatementImportModal
        open={showImport}
        onOpenChange={setShowImport}
        accounts={accounts}
        debts={debts}
        onSaved={refresh}
      />
    </div>
  );
}