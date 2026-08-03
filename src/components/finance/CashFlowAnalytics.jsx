import React from "react";
import {
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  format,
  subDays,
  subMonths,
  addDays,
  addWeeks,
  addMonths,
} from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

const RANGES = [
  { id: "7d",  label: "Last 7 days",   unit: "days",   count: 7,  bucket: "day" },
  { id: "30d", label: "Last 30 days",  unit: "days",   count: 30, bucket: "day" },
  { id: "3m",  label: "Last 3 months", unit: "months", count: 3,  bucket: "week" },
  { id: "6m",  label: "Last 6 months", unit: "months", count: 6,  bucket: "month" },
  { id: "12m", label: "Last 12 months",unit: "months", count: 12, bucket: "month" },
  { id: "all", label: "All time",      unit: "all",               bucket: "month" },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="backdrop-blur-md bg-zinc-900/80 border border-zinc-700/80 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[11px] text-zinc-400 mb-1.5 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-zinc-400 capitalize">{p.dataKey}</span>
          <span className="text-zinc-100 font-semibold tabular-nums ml-auto">
            ${p.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CashFlowAnalytics({ transactions }) {
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
        } catch { /* skip bad dates */ }
      }
      start = earliest ? startOfMonth(earliest) : startOfMonth(subMonths(now, 11));
    }

    const buckets = [];
    if (range.bucket === "day") {
      for (let d = startOfDay(start); d <= now; d = addDays(d, 1))
        buckets.push({ s: startOfDay(d), e: endOfDay(d), label: format(d, "MMM d") });
    } else if (range.bucket === "week") {
      for (let d = startOfWeek(start); d <= now; d = addWeeks(d, 1))
        buckets.push({ s: startOfWeek(d), e: endOfWeek(d), label: format(d, "MMM d") });
    } else {
      for (let d = startOfMonth(start); d <= now; d = addMonths(d, 1))
        buckets.push({ s: startOfMonth(d), e: endOfMonth(d), label: format(d, "MMM yy") });
    }

    let totalNet = 0;
    const points = buckets.map((b) => {
      let inc = 0, exp = 0;
      for (const t of transactions) {
        try {
          if (isWithinInterval(parseISO(t.date), { start: b.s, end: b.e })) {
            if (t.type === "income") inc += t.amount; else exp += t.amount;
          }
        } catch { /* skip bad dates */ }
      }
      totalNet += inc - exp;
      return { label: b.label, income: inc, expense: exp };
    });

    return { data: points, net: totalNet };
  }, [transactions, range]);

  const isLoss = net < 0;

  return (
    <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">Cash Flow Trends</h2>
          <p className="text-xs text-zinc-500">Income vs expenses over time</p>
        </div>
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

      <div className="h-[260px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb7185" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2.5} fill="url(#incomeGrad)" />
            <Area type="monotone" dataKey="expense" stroke="#fb7185" strokeWidth={2.5} fill="url(#expenseGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div
        className={`rounded-xl border p-4 flex items-center justify-between transition-all ${
          isLoss ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isLoss ? "bg-rose-500/20" : "bg-emerald-500/20"}`}>
            {isLoss ? <TrendingDown className="h-5 w-5 text-rose-400" /> : <TrendingUp className="h-5 w-5 text-emerald-400" />}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">
              {isLoss ? "Net Loss" : "Net Profit"} · {range.label.toLowerCase()}
            </p>
            <p className={`text-xl font-bold tabular-nums ${isLoss ? "text-rose-400" : "text-emerald-400"} ${isLoss ? "animate-pulse" : ""}`}>
              {isLoss ? "-" : "+"}${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        {isLoss && (
          <span className="text-[11px] text-rose-300/80 italic max-w-[140px] text-right hidden sm:block">
            Expenses exceed income — consider trimming.
          </span>
        )}
      </div>
    </div>
  );
}