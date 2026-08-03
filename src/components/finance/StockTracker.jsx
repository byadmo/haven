import React from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, TrendingDown, TrendingUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fmt = (v) =>
  v.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function StockTracker({ onChanged }) {
  const [stocks, setStocks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [prices, setPrices] = React.useState({});
  const [fetching, setFetching] = React.useState(false);
  const [symbol, setSymbol] = React.useState("");
  const [shares, setShares] = React.useState("");
  const [avg, setAvg] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const loadStocks = React.useCallback(async () => {
    const s = await base44.entities.Stock.list("-created_date");
    setStocks(s);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  React.useEffect(() => {
    if (stocks.length === 0 && !loading) return;
    fetchPrices(stocks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks.length]);

  async function fetchPrices(list) {
    if (list.length === 0) return;
    setFetching(true);
    try {
      const symbols = list.map((s) => s.symbol).join(", ");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the current real-time market price for each of these stock tickers? Return a JSON map of ticker symbol to current price in USD (number only, 2 decimals). Tickers: ${symbols}`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          additionalProperties: { type: "number" },
        },
      });
      setPrices(res || {});
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }

  async function addStock(e) {
    e.preventDefault();
    if (!symbol.trim() || !shares || !avg) return;
    setSaving(true);
    try {
      // resolve a friendly name
      let name = symbol.trim().toUpperCase();
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `What is the full company name for the stock ticker "${symbol.trim().toUpperCase()}"? Reply with just the company name.`,
          add_context_from_internet: true,
          model: "gemini_3_flash",
        });
        if (typeof res === "string") name = res.trim();
      } catch (e) {}
      await base44.entities.Stock.create({
        symbol: symbol.trim().toUpperCase(),
        name,
        shares: parseFloat(shares),
        avg_buy_price: parseFloat(avg),
      });
      setSymbol("");
      setShares("");
      setAvg("");
      setPrices({});
      await loadStocks();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function removeStock(id) {
    await base44.entities.Stock.delete(id);
    setPrices({});
    await loadStocks();
    onChanged?.();
  }

  const totalValue = stocks.reduce(
    (sum, s) => sum + (prices[s.symbol] || 0) * (s.shares || 0),
    0
  );
  const totalCost = stocks.reduce((sum, s) => sum + (s.avg_buy_price || 0) * (s.shares || 0), 0);
  const totalPnl = totalValue - totalCost;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">Stock Portfolio</h2>
          <p className="text-xs text-zinc-500">Track holdings &amp; realized/unrealized P&amp;L</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPrices(stocks)}
          disabled={fetching || stocks.length === 0}
          className="bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetching ? "animate-spin" : ""}`} />
          {fetching ? "Updating" : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Holdings */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-xl shadow-black/30">
          {loading ? (
            <p className="text-sm text-zinc-500 text-center py-8">Loading holdings…</p>
          ) : stocks.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">
              No holdings yet. Add your first stock on the right.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-1 pb-2 border-b border-zinc-800">
                <div className="col-span-4">Ticker</div>
                <div className="col-span-2 text-right">Shares</div>
                <div className="col-span-3 text-right">Avg Buy</div>
                <div className="col-span-3 text-right">P&amp;L</div>
              </div>
              {stocks.map((s) => {
                const price = prices[s.symbol];
                const hasPrice = typeof price === "number";
                const pnl = hasPrice ? (price - s.avg_buy_price) * s.shares : 0;
                const pnlPct = s.avg_buy_price ? (pnl / (s.avg_buy_price * s.shares)) * 100 : 0;
                return (
                  <div key={s.id} className="group grid grid-cols-12 items-center px-1 py-2 rounded-md hover:bg-zinc-800/40">
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeStock(s.id)}
                          className="h-5 w-5 rounded-md flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove stock"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-100 truncate">{s.symbol}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{s.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-sm text-zinc-300">{s.shares}</div>
                    <div className="col-span-3 text-right tabular-nums text-sm text-zinc-400">{fmt(s.avg_buy_price)}</div>
                    <div className="col-span-3 text-right">
                      {hasPrice ? (
                        <div>
                          <p className={`text-sm font-semibold tabular-nums ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {pnl >= 0 ? "+" : "-"}{fmt(Math.abs(pnl))}
                          </p>
                          <p className={`text-[10px] tabular-nums ${pnl >= 0 ? "text-emerald-500/70" : "text-rose-500/70"}`}>
                            {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">fetching…</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add form + summary */}
        <div className="space-y-3">
          <form
            onSubmit={addStock}
            className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-4 shadow-xl shadow-black/30 space-y-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Add Holding</h3>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Ticker Symbol</Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="AAPL"
                className="bg-zinc-950 border-zinc-800 text-zinc-100 uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Shares</Label>
                <Input type="number" step="any" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="10" className="bg-zinc-950 border-zinc-800 text-zinc-100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Avg Buy $</Label>
                <Input type="number" step="any" value={avg} onChange={(e) => setAvg(e.target.value)} placeholder="150.00" className="bg-zinc-950 border-zinc-800 text-zinc-100" />
              </div>
            </div>
            <Button type="submit" disabled={saving || !symbol || !shares || !avg} className="w-full bg-zinc-100 text-zinc-900 hover:bg-white">
              <Plus className="h-4 w-4 mr-1" /> {saving ? "Adding…" : "Add Stock"}
            </Button>
          </form>

          <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-4 shadow-xl shadow-black/30 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Market Value</span>
              <span className="tabular-nums font-semibold text-zinc-100">{fmt(totalValue)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Cost Basis</span>
              <span className="tabular-nums text-zinc-400">{fmt(totalCost)}</span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Total P&amp;L</span>
              <div className="flex items-center gap-1.5">
                {totalPnl >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                )}
                <span className={`text-sm font-bold tabular-nums ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {totalPnl >= 0 ? "+" : "-"}{fmt(Math.abs(totalPnl))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}