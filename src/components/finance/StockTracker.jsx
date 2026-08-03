import React from "react";
import { base44 } from "@/api/base44Client";
import { Plus, X, TrendingDown, TrendingUp, RefreshCw, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StockChart from "@/components/finance/StockChart";
import StockImportModal from "@/components/finance/StockImportModal";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ACCOUNTS = ["TFSA", "RRSP", "RESP", "FHSA", "Non-Registered", "Cash", "Other"];

const ACCOUNT_ACCENTS = {
  TFSA: "text-violet-300 bg-violet-500/15 border-violet-500/30",
  RRSP: "text-sky-300 bg-sky-500/15 border-sky-500/30",
  RESP: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  FHSA: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  "Non-Registered": "text-zinc-300 bg-zinc-500/15 border-zinc-500/30",
  Cash: "text-teal-300 bg-teal-500/15 border-teal-500/30",
  Other: "text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/30",
};

export default function StockTracker({ onChanged }) {
  const [stocks, setStocks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [prices, setPrices] = React.useState({});
  const [fetching, setFetching] = React.useState(false);
  const [symbol, setSymbol] = React.useState("");
  const [shares, setShares] = React.useState("");
  const [avg, setAvg] = React.useState("");
  const [account, setAccount] = React.useState("Non-Registered");
  const [saving, setSaving] = React.useState(false);
  const [priceKey, setPriceKey] = React.useState(0);
  const [filter, setFilter] = React.useState("All");
  const [showImport, setShowImport] = React.useState(false);

  const loadStocks = React.useCallback(async () => {
    const s = await base44.entities.Stock.list("-created_date");
    setStocks(s);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  React.useEffect(() => {
    if (stocks.length === 0) {
      setPrices({});
      return;
    }
    let cancelled = false;
    setFetching(true);
    const symbols = stocks.map((s) => s.symbol);
    base44.functions
      .invoke("FetchStockData", { symbols, interval: "1d", range: "5d" })
      .then((res) => {
        if (cancelled) return;
        const d = res?.data || res;
        setPrices(d?.prices || {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stocks, priceKey]);

  async function addStock(e) {
    e.preventDefault();
    if (!symbol.trim() || !shares || !avg) return;
    setSaving(true);
    try {
      await base44.entities.Stock.create({
        symbol: symbol.trim().toUpperCase(),
        name: symbol.trim().toUpperCase(),
        shares: parseFloat(shares),
        avg_buy_price: parseFloat(avg),
        account,
      });
      setSymbol("");
      setShares("");
      setAvg("");
      await loadStocks();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function removeStock(id) {
    await base44.entities.Stock.delete(id);
    await loadStocks();
    onChanged?.();
  }

  const getValue = (s) => (prices[s.symbol] || 0) * (s.shares || 0);
  const totalValue = stocks.reduce((sum, s) => sum + getValue(s), 0);
  const totalCost = stocks.reduce((sum, s) => sum + (s.avg_buy_price || 0) * (s.shares || 0), 0);
  const totalPnl = totalValue - totalCost;

  const grouped = stocks.reduce((map, s) => {
    const k = s.account || "Non-Registered";
    (map[k] = map[k] || []).push(s);
    return map;
  }, {});
  const groupKeys = Object.keys(grouped).sort();
  const visibleGroups = filter === "All" ? groupKeys : groupKeys.filter((g) => g === filter);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">Stock Portfolio</h2>
          <p className="text-xs text-zinc-500">Live prices via Yahoo Finance · grouped by account</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImport(true)}
            className="bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <Camera className="h-3.5 w-3.5 mr-1" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPriceKey((k) => k + 1)}
            disabled={fetching || stocks.length === 0}
            className="bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetching ? "animate-spin" : ""}`} />
            {fetching ? "Updating" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <StockChart stocks={stocks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-500 text-center py-8">Loading holdings…</p>
          ) : stocks.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No holdings yet. Add your first stock on the right.</p>
          ) : (
            visibleGroups.map((group) => {
              const items = grouped[group];
              const gValue = items.reduce((s, x) => s + getValue(x), 0);
              const gCost = items.reduce((s, x) => s + (x.avg_buy_price || 0) * (x.shares || 0), 0);
              const gPnl = gValue - gCost;
              return (
                <div
                  key={group}
                  className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-xl shadow-black/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${ACCOUNT_ACCENTS[group] || ACCOUNT_ACCENTS.Other}`}>
                        {group}
                      </span>
                      <span className="text-[11px] text-zinc-500">{items.length} holding{items.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-zinc-100">{fmt(gValue)}</p>
                      <p className={`text-[10px] tabular-nums ${gPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {gPnl >= 0 ? "+" : "-"}{fmt(Math.abs(gPnl))}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-1 pb-2 border-b border-zinc-800">
                      <div className="col-span-4">Ticker</div>
                      <div className="col-span-2 text-right">Shares</div>
                      <div className="col-span-3 text-right">Avg Buy</div>
                      <div className="col-span-3 text-right">P&amp;L</div>
                    </div>
                    {items.map((s) => {
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
                                {hasPrice && <p className="text-[11px] text-zinc-500 tabular-nums">now {fmt(price)}</p>}
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
                </div>
              );
            })
          )}
        </div>

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
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Account</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {ACCOUNTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
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
                {totalPnl >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-rose-400" />}
                <span className={`text-sm font-bold tabular-nums ${totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {totalPnl >= 0 ? "+" : "-"}{fmt(Math.abs(totalPnl))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StockImportModal open={showImport} onOpenChange={setShowImport} onSaved={loadStocks} />
    </section>
  );
}