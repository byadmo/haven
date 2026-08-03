import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import StockTracker from "@/components/finance/StockTracker";

export default function Portfolio() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />

      <main className="relative max-w-6xl mx-auto px-6 sm:px-6 py-10 sm:py-6">
        <StockTracker onChanged={() => setRefreshKey((k) => k + 1)} />
      </main>
    </div>
  );
}