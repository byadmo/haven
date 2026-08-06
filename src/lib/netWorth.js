import React from "react";
import { base44 } from "@/api/base44Client";

const ts = (d) => {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return isNaN(t) ? 0 : t;
};

/**
 * BUG 1 — Deduplicate Debt records by name.
 * When two Debt records share the same name, keep only the one with the most
 * recent updated_date (ties broken by created_date, then by record order).
 * Records without a name are kept as-is (keyed by id).
 */
export function dedupeDebtsByName(debts) {
  const byName = new Map();
  for (const d of debts || []) {
    const key = (d.name || "").trim().toLowerCase();
    if (!key) {
      byName.set(`__id_${d.id || Math.random()}`, d);
      continue;
    }
    const prev = byName.get(key);
    if (!prev) { byName.set(key, d); continue; }
    const a = ts(prev.updated_date) || ts(prev.created_date);
    const b = ts(d.updated_date) || ts(d.created_date);
    if (b > a) byName.set(key, d);
  }
  return [...byName.values()];
}

/**
 * BUG 2 + BUG 3 — Active liabilities for net-worth purposes.
 * `status === "paid_off"` is excluded entirely. `show_in_accounts` does NOT
 * filter (it only controls the Accounts list view, not whether a real
 * liability counts toward net worth). Result is deduped by name.
 */
export function activeLiabilities(debts) {
  return dedupeDebtsByName(debts).filter(
    (d) => (d.status || "active") === "active"
  );
}

/** Sum of active, deduped debt current_balance. */
export function sumDebts(debts) {
  return activeLiabilities(debts).reduce((s, d) => s + (d.current_balance || 0), 0);
}

/** BUG 6 — Accounts are already user-scoped by RLS on read; sum all balances. */
export function sumAccounts(accounts) {
  return (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
}

/** Cost basis of all stock holdings (avg_buy_price × shares). */
export function stockCostBasis(stocks) {
  return (stocks || []).reduce(
    (s, x) => s + (x.shares || 0) * (x.avg_buy_price || 0),
    0
  );
}

/**
 * BUG 5 — Fetch live market prices for the given stock holdings via the
 * FetchStockData backend function. Returns a map of { SYMBOL: price }.
 * Empty/missing symbols return an empty object; failures return {}.
 */
export async function fetchLivePrices(stocks) {
  const symbols = [...new Set(
    (stocks || [])
      .map((s) => (s.symbol || "").trim().toUpperCase())
      .filter(Boolean)
  )];
  if (!symbols.length) return {};
  try {
    const res = await base44.functions.invoke("FetchStockData", {
      symbols,
      interval: "1d",
      range: "5d",
    });
    return (res?.data || res)?.prices || {};
  } catch {
    return {};
  }
}

/**
 * BUG 5 — Investment market value using live prices; falls back to cost basis
 * (avg_buy_price × shares) for any symbol without a live price. Returns
 * { total, isLive, costBasis }. `isLive` is true only when at least one
 * holding had a live price; callers should label the value "cost basis" when
 * false.
 */
export function investmentValue(stocks, prices = {}) {
  let total = 0;
  let liveUsed = 0;
  const basis = stockCostBasis(stocks);
  for (const s of stocks || []) {
    const px = prices[s.symbol];
    const sh = s.shares || 0;
    if (typeof px === "number") {
      total += px * sh;
      liveUsed += 1;
    } else {
      total += (s.avg_buy_price || 0) * sh;
    }
  }
  const hasStocks = (stocks || []).length > 0;
  return {
    total,
    isLive: hasStocks && liveUsed > 0,
    costBasis: basis,
  };
}

/**
 * BUG 4 — Net Worth = sum(all Account balances)
 *                      + sum(Stock current market values)
 *                      - sum(active, deduped Debt current balances).
 */
export function computeNetWorth({ accounts, debts, stocks, prices = {} }) {
  const cash = sumAccounts(accounts);
  const debt = sumDebts(debts);
  const inv = investmentValue(stocks, prices);
  return {
    cash,
    debt,
    investments: inv.total,
    investmentsIsLive: inv.isLive,
    investmentsCostBasis: inv.costBasis,
    total: cash + inv.total - debt,
  };
}

/**
 * Hook: computes net worth with live stock prices. Re-fetches prices when the
 * holdings or refreshKey change. Returns the computeNetWorth result (with an
 * up-to-date `investments` value once prices load).
 */
export function useNetWorth(refreshKey, { accounts = [], debts = [], stocks = [] } = {}) {
  const [prices, setPrices] = React.useState({});
  React.useEffect(() => {
    let cancelled = false;
    fetchLivePrices(stocks).then((p) => { if (!cancelled) setPrices(p); });
    return () => { cancelled = true; };
  }, [stocks, refreshKey]);
  return computeNetWorth({ accounts, debts, stocks, prices });
}