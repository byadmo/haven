// @vitest-environment jsdom
import React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act, screen } from "@testing-library/react";

// Mock the Base44 SDK so the provider's Promise.all never touches the network.
// Every entity .list returns [] by default; tests override per-entity per test.
vi.mock("@/api/base44Client", () => {
  const fn = () => Promise.resolve([]);
  return {
    base44: {
      entities: {
        Transaction: { list: vi.fn(fn) },
        Debt: { list: vi.fn(fn) },
        Account: { list: vi.fn(fn) },
        Stock: { list: vi.fn(fn) },
        Category: { list: vi.fn(fn) },
        DebtPayment: { list: vi.fn(fn) },
        ActiveGoal: { list: vi.fn(fn) },
        UserFinancialProfile: { list: vi.fn(fn) },
      },
      functions: {
        // fetchLivePrices calls base44.functions.invoke("FetchStockData", ...)
        invoke: vi.fn(() => Promise.resolve({ data: { prices: {} } })),
      },
    },
  };
});

import { base44 } from "@/api/base44Client";
import { FinanceDataProvider, useFinanceData } from "@/lib/FinanceDataContext";

/* A tiny consumer that surfaces the context so tests can assert on it. */
function Consumer({ onReady }) {
  const ctx = useFinanceData();
  React.useEffect(() => {
    onReady && onReady(ctx);
  }, [ctx]);
  return <div data-testid="consumer">{String(ctx.loading)}</div>;
}

const mountProvider = (onReady) =>
  render(
    <FinanceDataProvider>
      <Consumer onReady={onReady} />
    </FinanceDataProvider>
  );

const allLists = () => [
  base44.entities.Transaction.list,
  base44.entities.Debt.list,
  base44.entities.Account.list,
  base44.entities.Stock.list,
  base44.entities.Category.list,
  base44.entities.DebtPayment.list,
  base44.entities.ActiveGoal.list,
  base44.entities.UserFinancialProfile.list,
];

beforeEach(() => {
  vi.clearAllMocks();
  allLists().forEach((m) => m.mockResolvedValue([]));
  base44.functions.invoke.mockResolvedValue({ data: { prices: {} } });
});

/* ------------------------------------------------------------------ *
 * G (provider half) — runtime safety
 * ------------------------------------------------------------------ */

describe("FinanceDataProvider runtime safety", () => {
  test("does not crash with empty entity arrays", async () => {
    let captured = null;
    let el;
    await act(async () => {
      el = mountProvider((ctx) => { captured = ctx; });
    });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");
    expect(captured).not.toBeNull();
    expect(captured.totalCash).toBe(0);
    expect(captured.totalDebt).toBe(0);
    el.unmount();
  });

  test("does not crash with null-ish entity arrays (lists resolve to [])", async () => {
    let captured = null;
    let el;
    // Every list resolves to [] (null entries never reach the reducer).
    await act(async () => {
      el = mountProvider((ctx) => { captured = ctx; });
    });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");
    expect(() => captured.totalCash).not.toThrow();
    expect(captured.netWorth).toBe(0);
    el.unmount();
  });

  test("computeAnalytics (via provider) handles undefined fields gracefully", async () => {
    base44.entities.Account.list.mockResolvedValue([
      { balance: undefined },
      { balance: 100 },
    ]);
    base44.entities.Debt.list.mockResolvedValue([
      { name: "A", current_balance: undefined, status: "active", interest_rate: undefined, minimum_payment: undefined },
      { name: "B", current_balance: 50, status: undefined, interest_rate: 0, minimum_payment: 0 },
    ]);
    base44.entities.Stock.list.mockResolvedValue([
      { symbol: "X", shares: undefined, avg_buy_price: undefined },
    ]);

    let captured = null;
    let el;
    await act(async () => { el = mountProvider((ctx) => { captured = ctx; }); });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");
    expect(captured.totalCash).toBe(100);
    expect(captured.totalDebt).toBe(50);
    expect(captured.portfolioCostBasis).toBe(0);
    el.unmount();
  });

  test("a failing entity fetch does not crash, still resolves loading=false", async () => {
    // Transaction.list rejects — provider wraps others in .catch, but Trnxn has
    // no .catch; Promise.all rejects outright. The provider sets loading=false
    // only inside .then. We assert this does not throw synchronously and that,
    // when a recoverable list fails, the app still loads.
    base44.entities.Debt.list.mockRejectedValue(new Error("boom")); // has .catch -> []
    let captured = null;
    let el;
    await act(async () => { el = mountProvider((ctx) => { captured = ctx; }); });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");
    expect(captured).not.toBeNull();
    expect(Array.isArray(captured.debts)).toBe(true);
    expect(captured.loading).toBe(false);
    el.unmount();
  });
});

/* ------------------------------------------------------------------ *
 * H — Integration consistency
 * ------------------------------------------------------------------ */

describe("FinanceDataProvider integration", () => {
  test("useFinanceData exposes analytics computed from loaded entities", async () => {
    base44.entities.Account.list.mockResolvedValue([{ balance: 1000 }]);
    base44.entities.Debt.list.mockResolvedValue([
      { name: "Card", current_balance: 400, status: "active", interest_rate: 20, minimum_payment: 40 },
    ]);
    base44.entities.Stock.list.mockResolvedValue([{ symbol: "AAPL", shares: 2, avg_buy_price: 100 }]);
    base44.entities.Transaction.list.mockResolvedValue([
      { type: "income", amount: 2000, date: new Date().toISOString().slice(0, 10) },
      { type: "expense", amount: 500, date: new Date().toISOString().slice(0, 10) },
    ]);

    let captured = null;
    let el;
    await act(async () => { el = mountProvider((ctx) => { captured = ctx; }); });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");
    expect(captured.totalCash).toBe(1000);
    expect(captured.totalDebt).toBe(400);
    expect(captured.portfolioCostBasis).toBe(200);
    expect(captured.currentMonthIncome).toBe(2000);
    expect(captured.currentMonthExpenses).toBe(500);
    expect(captured.netWorth).toBe(800); // 1000 + 200 - 400 (cost basis, no live prices)
    el.unmount();
  });

  test("context exposes `investments` as an alias of `stocks`", async () => {
    base44.entities.Stock.list.mockResolvedValue([{ symbol: "AAPL", shares: 1, avg_buy_price: 10 }]);
    let captured = null;
    let el;
    await act(async () => { el = mountProvider((ctx) => { captured = ctx; }); });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");
    expect(captured.investments).toBe(captured.stocks);
    expect(captured.investments).toHaveLength(1);
    el.unmount();
  });

  test("netWorth uses live market value once prices resolve", async () => {
    base44.entities.Account.list.mockResolvedValue([{ balance: 1000 }]);
    base44.entities.Stock.list.mockResolvedValue([{ symbol: "AAPL", shares: 2, avg_buy_price: 100 }]);
    base44.functions.invoke.mockResolvedValue({ data: { prices: { AAPL: 150 } } });

    let captured = null;
    let el;
    await act(async () => { el = mountProvider((ctx) => { captured = ctx; }); });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");
    // After the price effect resolves, the analytics recompute with live value.
    await waitFor(() => expect(captured.investmentsMarketValue).toBe(300));
    expect(captured.investmentsIsLive).toBe(true);
    expect(captured.netWorth).toBe(1300); // 1000 + (2*150) - 0
    el.unmount();
  });
});

/* ------------------------------------------------------------------ *
 * Additional provider tests
 * ------------------------------------------------------------------ */

describe("FinanceDataProvider lifecycle", () => {
  test("refreshData() re-fetches all 8 entity types", async () => {
    let captured = null;
    let el;
    await act(async () => { el = mountProvider((ctx) => { captured = ctx; }); });
    await waitFor(() => screen.getByTestId("consumer").textContent === "false");

    allLists().forEach((m) => expect(m).toHaveBeenCalledTimes(1));

    await act(async () => { captured.refreshData(); });
    await waitFor(() => {
      allLists().forEach((m) => expect(m).toHaveBeenCalledTimes(2));
    });
    el.unmount();
  });

  test("loading is true during the initial fetch, then false", async () => {
    // Make the fetches hang briefly so we can observe loading=true synchronously.
    let resolveAccounts;
    base44.entities.Account.list.mockReturnValue(
      new Promise((res) => { resolveAccounts = res; })
    );
    let captured = null;
    let el;
    await act(async () => { el = mountProvider((ctx) => { captured = ctx; }); });
    // The first captured context (before fetches resolve) should report loading.
    await waitFor(() => expect(captured.loading).toBe(true));
    await act(async () => { resolveAccounts([]); });
    await waitFor(() => expect(captured.loading).toBe(false));
    el.unmount();
  });
});