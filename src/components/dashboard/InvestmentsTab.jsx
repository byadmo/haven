import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { invokeFunc, money, pct } from "@/lib/dashboard";
import { Loader, Card3, Bar } from "@/components/dashboard/ui";
import { PieChart } from "lucide-react";

export default function InvestmentsTab({ refreshKey }) {
  const [prices, setPrices] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [contrib, setContrib] = useState(null);

  async function load() {
    try {
      const list = await base44.entities.Stock.list();
      setStocks(list);
      const symbols = [...new Set(list.map((s) => (s.symbol || "").trim().toUpperCase()).filter(Boolean))];
      if (symbols.length) {
        invokeFunc("FetchStockData", { symbols, interval: "1d", range: "1d" }).then((r) => setPrices(r?.prices || {})).catch(() => setPrices({}));
      } else { setPrices({}); }
    } catch (e) {}
    invokeFunc("trackContributions", {}).then(setContrib).catch(() => {});
  }

  useEffect(() => { load(); }, [refreshKey]);

  let cost = 0, mkt = 0;
  const rows = stocks.map((s) => {
    const price = prices?.[s.symbol] ?? 0;
    const mv = (s.shares || 0) * price;
    const cb = (s.shares || 0) * (s.avg_buy_price || 0);
    cost += cb; mkt += mv;
    return { ...s, price, mv, cb, pl: mv - cb, plPct: cb > 0 ? (mv - cb) / cb * 100 : 0 };
  });

  return (
    <div className="space-y-4">
      <Card3 title="Portfolio" subtitle="Live prices via Yahoo Finance">
        {!prices ? <Loader /> : stocks.length === 0 ? <p className="text-xs text-white/40">No holdings yet.</p> : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <Stat label="Market Value" value={money(mkt)} />
              <Stat label="Cost Basis" value={money(cost)} />
              <Stat label="Unrealized P/L" value={money(mkt - cost)} accent={mkt - cost >= 0 ? "emerald" : "rose"} />
            </div>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-xs text-white font-medium">{r.symbol}</p>
                    <p className="text-[10px] text-white/40 font-mono">{r.shares} sh · {money(r.avg_buy_price)} avg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono tabular-nums text-white">{money(r.mv)}</p>
                    <p className={`text-[10px] font-mono tabular-nums ${r.pl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{r.pl >= 0 ? "+" : ""}{money(r.pl)} ({pct(r.plPct)})</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card3>

      <Card3 title="Contribution Room" subtitle="TFSA / RRSP / FHSA">
        {!contrib ? <Loader /> : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {contrib.contributions.map((c) => (
              <div key={c.account_type} className={`rounded-lg border p-3 ${c.approaching_limit ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-black"}`}>
                <p className="text-xs font-semibold text-white">{c.account_type}</p>
                <p className="text-lg font-bold font-mono tabular-nums text-white">{pct(c.percentage_used)}</p>
                <div className="my-1.5"><Bar value={c.percentage_used} max={100} color={c.approaching_limit ? "bg-amber-500" : "bg-emerald-500"} /></div>
                <p className="text-[10px] text-white/40 font-mono">Invested {money(c.invested)}</p>
                <p className="text-[10px] text-white/40 font-mono">Room left {money(c.remaining_room)}</p>
                {c.approaching_limit && <p className="text-[10px] text-amber-400 mt-1">Approaching annual limit</p>}
              </div>
            ))}
          </div>
        )}
      </Card3>
    </div>
  );
}

function Stat({ label, value, accent }) {
  const c = accent === "emerald" ? "text-emerald-400" : accent === "rose" ? "text-rose-400" : "text-white";
  return (
    <div className="rounded-lg border border-white/10 bg-black p-2">
      <p className="text-[9px] uppercase tracking-widest text-white/40">{label}</p>
      <p className={`text-sm font-bold font-mono tabular-nums ${c}`}>{value}</p>
    </div>
  );
}