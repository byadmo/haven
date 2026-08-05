import React from "react";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  parseISO, format, subDays, subMonths, addDays, addWeeks, addMonths,
} from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

const RANGES = [
  { id: "7d",  label: "Last 7 days",   unit: "days",   count: 7,  bucket: "day" },
  { id: "30d", label: "Last 30 days",  unit: "days",   count: 30, bucket: "day" },
  { id: "3m",  label: "Last 3 months", unit: "months", count: 3,  bucket: "week" },
  { id: "6m",  label: "Last 6 months", unit: "months", count: 6,  bucket: "month" },
  { id: "12m", label: "Last 12 months",unit: "months", count: 12, bucket: "month" },
  { id: "all", label: "All time",      unit: "all",               bucket: "month" },
];

function ChartTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="backdrop-blur-md bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[11px] text-zinc-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-400 capitalize">{p.dataKey}</span>
          <span className="text-zinc-100 font-semibold tabular-nums ml-auto">
            {fmt(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Reconstructs historical net worth: today's (cash - debt) minus the cumulative
// income/expense transactions that occurred *after* each bucket.
export default function NetWorthChart({ transactions, accounts, debts }) {
  const { fmtMoney: fmt, fmtAxis } = useCurrency();
  const [rangeId, setRangeId] = React.useState("3m");
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[2];

  const { data, net } = React.useMemo(() => {
    const now = new Date();
    let start;
    if (range.unit === "days") start = startOfDay(subDays(now, range.count - 1));
    else if (range.unit === "months") start = startOfMonth(subMonths(now, range.count - 1));
    else {
      let earliest = null;
      for (const t of transactions) {
        try {
          const d = parseISO(t.date);
          if (!earliest || d < earliest) earliest = d;
        } catch {}
      }
      start = earliest ? startOfMonth(earliest) : startOfMonth(subMonths(now, 11));
    }

    const buckets = [];
    if (range.bucket === "day") {
      for (let d = startOfDay(start); d <= now; d = addDays(d, 1))
        buckets.push({ e: endOfDay(d), label: format(d, "MMM d") });
    } else if (range.bucket === "week") {
      for (let d = startOfWeek(start); d <= now; d = addWeeks(d, 1))
        buckets.push({ e: endOfWeek(d), label: format(d, "MMM d") });
    } else {
      for (let d = startOfMonth(start); d <= now; d = addMonths(d, 1))
        buckets.push({ e: endOfMonth(d), label: format(d, "MMM yy") });
    }

    const todayCash = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const todayDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
    const todayNetWorth = todayCash - todayDebt;

    const points = buckets.map((b) => {
      let futureNet = 0;
      for (const t of transactions) {
        try {
          const d = parseISO(t.date);
          if (d > b.e) futureNet += (t.type === "income" ? t.amount : -t.amount);
        } catch {}
      }
      const nw = todayNetWorth - futureNet;
      return { label: b.label, netWorth: Math.round(nw * 100) / 100, raw: nw };
    });

    return { data: points, net: todayNetWorth };
  }, [transactions, accounts, debts, range]);

  const isLoss = net < 0;
  const latest = data[data.length - 1]?.raw ?? net;
  const first = data[0]?.raw ?? net;
  const delta = latest - first;

  // Y-domain that always includes zero so dips below 0 are visible.
  const values = data.map((d) => d.raw);
  let dMax = Math.max(0, ...values);
  let dMin = Math.min(0, ...values);
  const span = (dMax - dMin) || 1;
  const pad = span * 0.08;
  if (dMax > 0) dMax += pad;
  if (dMin < 0) dMin -= pad;
  // Fraction from the top of the plot area where y = 0 sits.
  const zeroOffset = dMax / (dMax - dMin || 1);
  const o = Math.max(0, Math.min(1, zeroOffset));

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <Select value={rangeId} onValueChange={setRangeId}>
          <SelectTrigger className="w-[150px] h-8 text-xs bg-zinc-950/60 border-zinc-800 text-zinc-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {RANGES.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-[20rem] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor="#34d399" stopOpacity={0.55} />
                <stop offset={o} stopColor="#34d399" stopOpacity={0.45} />
                <stop offset={o} stopColor="#f43f5e" stopOpacity={0.45} />
                <stop offset={1} stopColor="#f43f5e" stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="nwStroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor="#34d399" />
                <stop offset={o} stopColor="#34d399" />
                <stop offset={o} stopColor="#f43f5e" />
                <stop offset={1} stopColor="#f43f5e" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis
              domain={[dMin, dMax]}
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtAxis(v)}
            />
            <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
            <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="netWorth" stroke="url(#nwStroke)" strokeWidth={2.5} fill="url(#nwFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className={`rounded-xl border p-4 flex items-center justify-between transition-all ${
        isLoss ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isLoss ? "bg-rose-500/20" : "bg-emerald-500/20"}`}>
            {isLoss ? <TrendingDown className="h-5 w-5 text-rose-400" /> : <TrendingUp className="h-5 w-5 text-emerald-400" />}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Current Net Worth</p>
            <p className={`text-xl font-bold tabular-nums ${isLoss ? "text-rose-400" : "text-emerald-300"}`}>
              {fmt(net)}
            </p>
          </div>
        </div>
        {Math.abs(delta) > 0.005 && (
          <span className="text-[11px] tabular-nums italic max-w-[160px] text-right text-zinc-400">
            {delta >= 0 ? "+" : "-"}{fmt(Math.abs(delta))} over {range.label.toLowerCase()}
          </span>
        )}
      </div>
    </div>
  );
}