import React from "react";
import { base44 } from "@/api/base44Client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const INTERVALS = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1H", value: "60m" },
  { label: "1D", value: "1d" },
];

const fmtTime = (ts, interval) => {
  const d = new Date(ts * 1000);
  if (interval === "1d") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const fmtNum = (v) =>
  v == null
    ? "-"
    : v.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CustomTooltip({ active, payload, label, interval }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-semibold text-zinc-100 tabular-nums">
          {fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function StockChart({ stocks }) {
  const [view, setView] = React.useState("portfolio");
  const [interval, setInterval] = React.useState("5m");
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!stocks?.length) {
      setData([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const symbols = stocks.map((s) => s.symbol);
    base44.functions
      .invoke("FetchStockData", { symbols, interval })
      .then((res) => {
        if (cancelled) return;
        const d = res?.data || res;
        const timestamps = d.timestamps || [];
        const series = d.series || {};
        if (view === "portfolio") {
          const sharesMap = {};
          stocks.forEach((s) => (sharesMap[s.symbol] = s.shares || 0));
          const len = timestamps.length;
          const points = timestamps.map((ts, i) => {
            let sum = 0;
            for (const sym of symbols) {
              const c = series[sym]?.[i];
              if (c != null) sum += (sharesMap[sym] || 0) * c;
            }
            const time = fmtTime(ts, interval);
            return { time, value: sum };
          });
          setData(points);
        } else {
          const closes = series[view] || [];
          const points = timestamps.map((ts, i) => ({
            time: fmtTime(ts, interval),
            value: closes[i],
          }));
          setData(points);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load chart data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stocks, view, interval]);

  if (!stocks?.length) {
    return (
      <p className="text-sm text-zinc-500 text-center py-8">
        Add a holding to see price charts.
      </p>
    );
  }

  const up = data.length >= 2 ? data[data.length - 1].value - data[0].value : 0;

  return (
    <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-xl shadow-black/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip active={view === "portfolio"} onClick={() => setView("portfolio")}>
            Portfolio
          </ToggleChip>
          {stocks.map((s) => (
            <ToggleChip key={s.id} active={view === s.symbol} onClick={() => setView(s.symbol)}>
              {s.symbol}
            </ToggleChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {INTERVALS.map((iv) => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium tabular-nums transition-colors ${
                interval === iv.value
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-rose-400 text-center py-8">{error}</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No data for this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={up >= 0 ? "#34d399" : "#fb7185"} />
                  <stop offset="100%" stopColor={up >= 0 ? "#10b981" : "#f43f5e"} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => "$" + (typeof v === "number" ? v.toFixed(0) : v)}
                width={50}
              />
              <Tooltip content={<CustomTooltip interval={interval} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#lineGrad)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {data.length >= 2 && !loading && !error && (
        <p className={`text-xs mt-2 tabular-nums ${up >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {up >= 0 ? "▲" : "▼"} {up >= 0 ? "+" : "-"}
          {Math.abs(up).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
          over selected range
        </p>
      )}
    </div>
  );
}

function ToggleChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30"
          : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}