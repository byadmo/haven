import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import StockTracker from "@/components/finance/StockTracker";
import InvestmentsTab from "@/components/dashboard/InvestmentsTab";

export default function Portfolio() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />

      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-8">
        <PageTitle title="Portfolio" subtitle="Track holdings, performance, and contribution room" />
        <StockTracker onChanged={() => setRefreshKey((k) => k + 1)} />
        <InvestmentsTab refreshKey={refreshKey} />
      </main>
    </div>
  );
}