import React from "react";
import { Outlet } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CurrencyProvider } from "@/lib/currency-context";
import { computeAnalytics } from "@/lib/financeAnalytics";
import { fetchLivePrices } from "@/lib/netWorth";
import { computeCategoryUpdates } from "@/lib/categorizeAuto";
import ThemeRoot from "@/components/ThemeRoot";
import FinancialSplash from "@/components/finance/FinancialSplash";
import FinancialHeader from "@/components/finance/FinancialHeader";
import { useToast } from "@/components/ui/use-toast";

const FinanceDataContext = React.createContext(null);

export function FinanceDataProvider({ children }) {
  const { toast } = useToast();
  const [data, setData] = React.useState({
    transactions: [],
    debts: [],
    accounts: [],
    stocks: [],
    categories: [],
    debtPayments: [],
    goals: [],
    profile: null,
    recurringBills: [],
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
      base44.entities.RecurringBill.list("-created_date", 500).catch(() => []),
    ]).then(([transactions, debts, accounts, stocks, categories, debtPayments, goals, profileRows, recurringBills]) => {
      if (cancelled) return;
      setData({ transactions, debts, accounts, stocks, categories, debtPayments, goals, profile: profileRows?.[0] || null, recurringBills });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  // B1 — auto-categorize any transaction with an empty/null category on load.
  // Persists once per batch and surfaces a toast. Once categorized the rows
  // are no longer empty, so this won't re-run or double-write.
  React.useEffect(() => {
    if (!data.transactions.length) return;
    let cancelled = false;
    (async () => {
      const updates = computeCategoryUpdates(data.transactions);
      if (!updates.length) return;
      try {
        await base44.entities.Transaction.bulkUpdate(updates);
        if (cancelled) return;
        setData((prev) => ({
          ...prev,
          transactions: prev.transactions.map((t) => {
            const u = updates.find((x) => x.id === t.id);
            return u ? { ...t, category: u.category } : t;
          }),
        }));
        toast({ title: `Auto-categorized ${updates.length} transaction${updates.length === 1 ? "" : "s"}` });
      } catch {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.transactions.length]);

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

  // F4 — capture a daily net-worth snapshot (only the first app open each day).
  React.useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const latest = await base44.entities.NetWorthSnapshot.list("-date", 1).catch(() => []);
        if (latest[0] && latest[0].date === today) return;
        const totalCash = (data.accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
        const totalDebt = (data.debts || []).reduce((s, d) => (d.status !== "paid_off" ? s + (d.current_balance || 0) : s), 0);
        const totalInv = (data.stocks || []).reduce((s, st) => s + (st.shares || 0) * (st.avg_buy_price || 0), 0);
        const nw = analytics.netWorth != null ? analytics.netWorth : totalCash + totalInv - totalDebt;
        await base44.entities.NetWorthSnapshot.create({ date: today, net_worth: nw, total_cash: totalCash, total_debt: totalDebt, total_investments: totalInv });
      } catch {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, refreshKey]);

  // Customizable nav bar — stored on the user's financial profile. Exposed so
  // the nav bars and the Settings "Customize Nav" panel can read/save it. Save
  // persists optimistically (local state updates first → nav re-renders
  // immediately, no page reload).
  const navItems = data.profile?.nav_items ?? null;

  async function saveNavItems(nav_items) {
    setData((prev) => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, nav_items } : { income_type: "fixed", nav_items },
    }));
    try {
      if (data.profile?.id) {
        await base44.entities.UserFinancialProfile.update(data.profile.id, { nav_items });
      } else {
        const created = await base44.entities.UserFinancialProfile.create({ income_type: "fixed", nav_items });
        setData((prev) => ({ ...prev, profile: created }));
      }
      toast({ title: "Navigation updated" });
    } catch (e) {
      refresh();
      toast({ title: "Could not save navigation", variant: "destructive" });
    }
  }

  // Theme — persisted on the user's financial profile (survives logout/login).
  // Applied instantly via optimistic local state, then written to the entity.
  async function setTheme(theme) {
    setData((prev) => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, theme } : { income_type: "fixed", theme },
    }));
    try {
      if (data.profile?.id) {
        await base44.entities.UserFinancialProfile.update(data.profile.id, { theme });
      } else {
        const created = await base44.entities.UserFinancialProfile.create({ income_type: "fixed", theme });
        setData((prev) => ({ ...prev, profile: created }));
      }
    } catch (e) {
      refresh();
      toast({ title: "Could not save theme", variant: "destructive" });
    }
  }

  // AI Auto-Detection toggle for the Recurring Bills page — persisted on the
  // financial profile (survives logout/login). Optimistic local update first.
  const aiAutoDetect = data.profile?.ai_auto_detect_bills ?? true;
  async function setAiAutoDetect(value) {
    setData((prev) => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ai_auto_detect_bills: value } : { income_type: "fixed", ai_auto_detect_bills: value },
    }));
    try {
      if (data.profile?.id) {
        await base44.entities.UserFinancialProfile.update(data.profile.id, { ai_auto_detect_bills: value });
      } else {
        const created = await base44.entities.UserFinancialProfile.create({ income_type: "fixed", ai_auto_detect_bills: value });
        setData((prev) => ({ ...prev, profile: created }));
      }
    } catch (e) {
      refresh();
      toast({ title: "Could not save setting", variant: "destructive" });
    }
  }

  // Generic profile patcher — optimistically merges into local profile state,
  // then persists (creating the profile row on first edit). Used by the
  // Paycheque Allocator income-profile card.
  async function updateProfile(patch) {
    setData((prev) => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ...patch } : { income_type: "fixed", ...patch },
    }));
    try {
      if (data.profile?.id) {
        await base44.entities.UserFinancialProfile.update(data.profile.id, patch);
      } else {
        const created = await base44.entities.UserFinancialProfile.create({ income_type: "fixed", ...patch });
        setData((prev) => ({ ...prev, profile: created }));
      }
    } catch (e) {
      refresh();
      toast({ title: "Could not save profile", variant: "destructive" });
    }
  }

  const value = {
    ...data,
    // Aliases the rest of the app expects
    investments: data.stocks, // the entity is Stock; exposed as `investments`
    refreshData: refresh, // canonical refresh fn (also available as `refresh`)
    loading,
    error: null,
    refresh,
    refreshKey,
    navItems,
    saveNavItems,
    theme: data.profile?.theme || "midnight",
    setTheme,
    aiAutoDetect,
    setAiAutoDetect,
    updateProfile,
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
  const { loading, theme } = useFinanceData();
  const [showSplash, setShowSplash] = React.useState(() => {
    try { return sessionStorage.getItem("fin_splash_shown") !== "1"; } catch { return true; }
  });
  const handleSplashComplete = React.useCallback(() => {
    setShowSplash(false);
    try { sessionStorage.setItem("fin_splash_shown", "1"); } catch {}
  }, []);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }
  return (
      <ThemeRoot theme={theme} app="finance" className="dark min-h-screen relative finance-accent">
        {showSplash && <FinancialSplash onComplete={handleSplashComplete} />}
        {!showSplash && (
          <div className="flex flex-col min-h-screen selection:bg-emerald-500/30">
            <FinancialHeader />
            <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 pb-24 sm:pb-8">
              {children ?? <Outlet />}
            </main>
          </div>
        )}
      </ThemeRoot>
    );
}