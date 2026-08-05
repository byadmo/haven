import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import CashFlowTab from "@/components/dashboard/CashFlowTab";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function CashFlow() {
  const { refresh } = useFinanceData();
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => { refresh(); setRefreshKey((k) => k + 1); }}
            className="border-white/10 text-white/70 hover:text-white hover:border-white/30"
          >
            <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />
      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6">
        <CashFlowTab refreshKey={refreshKey} />
      </main>
    </div>
  );
}