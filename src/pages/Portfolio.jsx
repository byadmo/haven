import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import StockTracker from "@/components/finance/StockTracker";

export default function Portfolio() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100 selection:bg-violet-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-600/10 blur-[120px]" />
      </div>

      <DashboardHeader />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <StockTracker onChanged={() => setRefreshKey((k) => k + 1)} />
      </main>
    </div>
  );
}