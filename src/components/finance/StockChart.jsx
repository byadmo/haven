import React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  if (interval === "1d") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const fmtNum = (v) =>
  v == null
    ? "-"
    : v.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function CustomTooltip({ active, payload, label, interval }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/95 backdrop-blur px-3 py-2 shadow-xl">
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
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [display, setDisplay] = React.useState({ key: "portfolio|5m", points: [], isPortfolio: true });

  React.useEffect(() => {
    if (!stocks?.length) {
      setDisplay({ key: `${view}|${interval}`, points: [], isPortfolio: view === "portfolio" });
      setError(null);
      return;
    }
    let cancelled = false;
    setPending(true);
    const symbols = stocks.map((s) => s.symbol);
    base44.functions
      .invoke("FetchStockData", { symbols, interval })
      .then((res) => {
        if (cancelled) return;
        const d = res?.data || res;
        const timestamps = d.timestamps || [];
        const series = d.series || {};
        let points;
        if (view === "portfolio") {
          const sharesMap = {};
          stocks.forEach((s) => (sharesMap[s.symbol] = s.shares || 0));
          points = timestamps.map((ts, i) => {
            let sum = 0;
            for (const sym of symbols) {
              const c = series[sym]?.[i];
              if (c != null) sum += (sharesMap[sym] || 0) * c;
            }
            return { time: fmtTime(ts, interval), value: sum };
          });
        } else {
          const closes = series[view] || [];
          points = timestamps.map((ts, i) => ({ time: fmtTime(ts, interval), value: closes[i] }));
        }
        setError(null);
        setDisplay({ key: `${view}|${interval}`, points, isPortfolio: view === "portfolio" });
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load chart data");
      })
      .finally(() => {
        if (!cancelled) setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stocks, view, interval]);

  const firstLoad = pending && display.points.length === 0;
  const valid = display.points.length > 0 && !error;
  const trendUp =
    valid && display.points.length >= 2
      ? (display.points[display.points.length - 1].value || 0) - (display.points[0].value || 0)
      : 0;
  const stroke = trendUp >= 0 ? "#34d399" : "#fb7185";
  const summaryLabel = view === "portfolio" ? "Portfolio value" : `${view}`;

  return (
    <div className="relative rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-xl shadow-black/30 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-1.5">
          <SegChip group="view" active={view === "portfolio"} onClick={() => setView("portfolio")} gradient>
            Portfolio
          </SegChip>
          {stocks.map((s, i) => (
            <SegChip
              key={s.id}
              group={`view${Math.floor(i / 4)}`}
              active={view === s.symbol}
              onClick={() => setView(s.symbol)}
              gradient
            >
              {s.symbol}
            </SegChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {INTERVALS.map((iv) => (
            <SegBtn key={iv.value} active={interval === iv.value} onClick={() => setInterval(iv.value)}>
              {iv.label}
            </SegBtn>
          ))}
        </div>
      </div>

      <div className="h-64 w-full relative">
        {firstLoad ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              key={display.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute inset-0"
            >
              {valid ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={display.points} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={stroke} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={stroke} stopOpacity={0.4} />
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
                      stroke={stroke}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive
                      animationDuration={500}
                      animationEasing="ease-out"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-rose-400 text-center py-8 flex items-center justify-center h-full">{error || "No data for this range."}</p>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {pending && !firstLoad && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-950/70 border border-zinc-800 backdrop-blur">
            <div className="w-3 h-3 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-400">Updating</span>
          </div>
        )}
      </div>

      {valid && (
        <p className={`text-xs mt-2 tabular-nums ${trendUp >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {trendUp >= 0 ? "▲" : "▼"} {trendUp >= 0 ? "+" : "-"}
          {Math.abs(trendUp).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
          {summaryLabel} · selected range
        </p>
      )}
    </div>
  );
}

function SegChip({ active, onClick, children, gradient }) {
  return (
    <button
      onClick={onClick}
      className="relative h-7 px-3 rounded-full text-xs font-medium bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
    >
      {active && (
        <motion.span
          layoutId="seg-view"
          className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className={`relative ${active ? "text-white" : "text-zinc-400 hover:text-zinc-100"}`}>{children}</span>
    </button>
  );
}

function SegBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="relative h-7 px-2.5 rounded-md text-[11px] font-medium tabular-nums transition-colors"
    >
      {active && (
        <motion.span
          layoutId="seg-interval"
          className="absolute inset-0 rounded-md bg-zinc-100 shadow"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className={`relative ${active ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-100"}`}>{children}</span>
    </button>
  );
}