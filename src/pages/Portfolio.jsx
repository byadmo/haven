import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import StockTracker from "@/components/finance/StockTracker";

export default function Portfolio() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <StockTracker onChanged={() => setRefreshKey((k) => k + 1)} />
      </main>
    </div>
  );
}