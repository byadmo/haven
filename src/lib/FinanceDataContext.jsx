import React from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CurrencyProvider } from "@/lib/currency-context";
import { computeAnalytics } from "@/lib/financeAnalytics";
import { fetchLivePrices } from "@/lib/netWorth";

const FinanceDataContext = React.createContext(null);

export function FinanceDataProvider({ children }) {
  const [data, setData] = React.useState({
    transactions: [],
    debts: [],
    accounts: [],
    stocks: [],
    categories: [],
    debtPayments: [],
    goals: [],
    profile: null,
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [stockPrices, setStockPrices] = React.useState({});

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
      base44.entities.ActiveGoal.list("-created_date").catch(() => []),
      base44.entities.UserFinancialProfile.list("-created_date", 1).catch(() => []),
    ]).then(([transactions, debts, accounts, stocks, categories, debtPayments, goals, profileRows]) => {
      if (cancelled) return;
      setData({ transactions, debts, accounts, stocks, categories, debtPayments, goals, profile: profileRows?.[0] || null });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Live stock prices — fetched once per refresh and threaded into the
  // analytics engine so net worth uses market value (not just cost basis).
  React.useEffect(() => {
    let cancelled = false;
    fetchLivePrices(data.stocks).then((p) => {
      if (!cancelled) setStockPrices(p);
    });
    return () => { cancelled = true; };
  }, [data.stocks, refreshKey]);

  // Single source of truth — every derived metric is computed here and
  // consumed across the app via useFinanceData(). No page should recompute
  // net worth, debt totals, or any metric independently.
  const analytics = React.useMemo(
    () =>
      computeAnalytics({
        accounts: data.accounts,
        transactions: data.transactions,
        debts: data.debts,
        stocks: data.stocks,
        stockPrices,
      }),
    [data.accounts, data.transactions, data.debts, data.stocks, stockPrices]
  );

  const value = {
    ...data,
    // Aliases the rest of the app expects
    investments: data.stocks, // the entity is Stock; exposed as `investments`
    refreshData: refresh, // canonical refresh fn (also available as `refresh`)
    loading,
    error: null,
    refresh,
    refreshKey,
    ...analytics,
  };

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  );
}

export function useFinanceData() {
  const ctx = React.useContext(FinanceDataContext);
  if (!ctx) throw new Error("useFinanceData must be used within FinanceDataProvider");
  return ctx;
}

// Reusable provider shell so any component (not just a routed <Outlet/>)
// can host the finance data context — e.g. RootGate rendering <Home/> directly.
export function FinanceShell({ children }) {
  return (
    <CurrencyProvider>
      <FinanceDataProvider>
        <FinanceLayoutInner>{children}</FinanceLayoutInner>
      </FinanceDataProvider>
    </CurrencyProvider>
  );
}

export function FinanceLayout() {
  return <FinanceShell><Outlet /></FinanceShell>;
}

function FinanceLayoutInner({ children }) {
  const { loading } = useFinanceData();
  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }
  // Wrap finance pages in .finance-accent so the brand-accent palette
  // resolves to indigo (see index.css). Education pages are not wrapped and
  // keep the default emerald.
  return <div className="finance-accent">{children ?? <Outlet />}</div>;
}