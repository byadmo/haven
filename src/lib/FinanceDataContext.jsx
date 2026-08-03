import React from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const FinanceDataContext = React.createContext(null);

export function FinanceDataProvider({ children }) {
  const [data, setData] = React.useState({
    transactions: [],
    debts: [],
    accounts: [],
    stocks: [],
    categories: [],
    debtPayments: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.entities.Transaction.list("-date", 1000),
      base44.entities.Debt.list("-created_date").catch(() => []),
      base44.entities.Account.list("-created_date").catch(() => []),
      base44.entities.Stock.list("-created_date").catch(() => []),
      base44.entities.Category.list("-created_date").catch(() => []),
      base44.entities.DebtPayment.list("-date", 500).catch(() => []),
    ]).then(([transactions, debts, accounts, stocks, categories, debtPayments]) => {
      if (cancelled) return;
      setData({ transactions, debts, accounts, stocks, categories, debtPayments });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <FinanceDataContext.Provider value={{ ...data, loading, refresh, refreshKey }}>
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData() {
  const ctx = React.useContext(FinanceDataContext);
  if (!ctx) throw new Error("useFinanceData must be used within FinanceDataProvider");
  return ctx;
}

export function FinanceLayout() {
  return (
    <FinanceDataProvider>
      <FinanceLayoutInner />
    </FinanceDataProvider>
  );
}

function FinanceLayoutInner() {
  const { loading } = useFinanceData();
  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }
  return <Outlet />;
}