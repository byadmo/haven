import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, LineChart as LineIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { startOfMonth, subMonths, format } from "date-fns";

const MONTHS = 6;

export default function NetWorthHistory() {
  const [snapshots, setSnapshots] = useState([]);
  useEffect(() => {
    base44.entities.NetWorthSnapshot.list("-date", 500).then(setSnapshots).catch(() => setSnapshots([]));
  }, []);

  const series = useMemo(() => {
    const byMonth = new Map();
    const today = new Date();
    for (let i = MONTHS - 1; i >= 0; i--) {
      const d = startOfMonth(subMonths(today, i));
      byMonth.set(format(d, "yyyy-MM"), { label: format(d, "MMM"), net_worth: null, _date: null });
    }
    snapshots.forEach((s) => {
      if (!s.date) return;
      const key = format(new Date(s.date + "T00:00:00"), "yyyy-MM");
      const cur = byMonth.get(key);
      if (!cur || s.net_worth == null) return;
      const dt = new Date(s.date + "T00:00:00");
      if (!cur._date || dt >= cur._date) {
        byMonth.set(key, { label: cur.label, net_worth: s.net_worth, _date: dt });
      }
    });
    return [...byMonth.values()].map(({ label, net_worth }) => ({ label, net_worth }));
  }, [snapshots]);

  const valid = series.filter((d) => d.net_worth != null);
  const latest = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  const trendPct = latest && prev && prev.net_worth !== 0
    ? ((latest.net_worth - prev.net_worth) / Math.abs(prev.net_worth)) * 100
    : null;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <LineIcon className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Net Worth History</p>
      </div>
      {valid.length >= 2 ? (
        <>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">
                ${(latest.net_worth || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Latest · {latest.label}</p>
            </div>
            {trendPct != null && (
              <span className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${trendPct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {trendPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}% vs last
              </span>
            )}
          </div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} formatter={(v) => `$${Number(v).toFixed(0)}`} />
                <Line type="monotone" dataKey="net_worth" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-sm text-white/30 text-center py-12">Keep using the app to build your net worth history.</p>
      )}
    </div>
  );
}