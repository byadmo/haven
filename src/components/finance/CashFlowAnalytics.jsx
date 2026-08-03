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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  format,
  subWeeks,
  subMonths,
  subYears,
} from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

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
            ${p.value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CashFlowAnalytics({ transactions }) {
  const [period, setPeriod] = React.useState("month");
  const [data, setData] = React.useState([]);
  const [net, setNet] = React.useState(0);

  React.useEffect(() => {
    const now = new Date();
    let points = [];
    let currentNet = 0;

    if (period === "week") {
      for (let i = 7; i >= 0; i--) {
        const s = startOfWeek(subWeeks(now, i));
        const e = endOfWeek(subWeeks(now, i));
        let inc = 0, exp = 0;
        transactions.forEach((t) => {
          if (isWithinInterval(parseISO(t.date), { start: s, end: e })) {
            if (t.type === "income") inc += t.amount; else exp += t.amount;
          }
        });
        points.push({ label: format(s, "MMM d"), income: inc, expense: exp });
      }
    } else if (period === "month") {
      for (let i = 5; i >= 0; i--) {
        const s = startOfMonth(subMonths(now, i));
        const e = endOfMonth(subMonths(now, i));
        let inc = 0, exp = 0;
        transactions.forEach((t) => {
          if (isWithinInterval(parseISO(t.date), { start: s, end: e })) {
            if (t.type === "income") inc += t.amount; else exp += t.amount;
          }
        });
        points.push({ label: format(s, "MMM"), income: inc, expense: exp });
      }
    } else {
      for (let i = 2; i >= 0; i--) {
        const s = startOfYear(subYears(now, i));
        const e = endOfYear(subYears(now, i));
        let inc = 0, exp = 0;
        transactions.forEach((t) => {
          if (isWithinInterval(parseISO(t.date), { start: s, end: e })) {
            if (t.type === "income") inc += t.amount; else exp += t.amount;
          }
        });
        points.push({ label: format(s, "yyyy"), income: inc, expense: exp });
      }
    }

    // current period net
    let cs, ce;
    if (period === "week") { cs = startOfWeek(now); ce = endOfWeek(now); }
    else if (period === "month") { cs = startOfMonth(now); ce = endOfMonth(now); }
    else { cs = startOfYear(now); ce = endOfYear(now); }
    let cn = 0;
    transactions.forEach((t) => {
      if (isWithinInterval(parseISO(t.date), { start: cs, end: ce })) {
        cn += t.type === "income" ? t.amount : -t.amount;
      }
    });
    currentNet = cn;

    setData(points);
    setNet(currentNet);
  }, [transactions, period]);

  const isLoss = net < 0;

  return (
    <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">Cash Flow Trends</h2>
          <p className="text-xs text-zinc-500">Income vs expenses over time</p>
        </div>
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v)} className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-1">
          <ToggleGroupItem value="week" className="data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50 text-zinc-400 px-2.5 py-1 text-xs rounded-md">Week</ToggleGroupItem>
          <ToggleGroupItem value="month" className="data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50 text-zinc-400 px-2.5 py-1 text-xs rounded-md">Month</ToggleGroupItem>
          <ToggleGroupItem value="year" className="data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50 text-zinc-400 px-2.5 py-1 text-xs rounded-md">Year</ToggleGroupItem>
        </ToggleGroup>
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
            <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#3f3f46", strokeWidth: 1 }} />
            <Area type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2.5} fill="url(#incomeGrad)" />
            <Area type="monotone" dataKey="expense" stroke="#fb7185" strokeWidth={2.5} fill="url(#expenseGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Net profit/loss indicator */}
      <div
        className={`rounded-xl border p-4 flex items-center justify-between transition-all ${
          isLoss
            ? "border-rose-500/40 bg-rose-500/10"
            : "border-emerald-500/30 bg-emerald-500/10"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-full flex items-center justify-center ${isLoss ? "bg-rose-500/20" : "bg-emerald-500/20"}`}>
            {isLoss ? <TrendingDown className="h-5 w-5 text-rose-400" /> : <TrendingUp className="h-5 w-5 text-emerald-400" />}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">
              {isLoss ? "Net Loss" : "Net Profit"} · {period === "week" ? "this week" : period === "month" ? "this month" : "this year"}
            </p>
            <p className={`text-xl font-bold tabular-nums ${isLoss ? "text-rose-400" : "text-emerald-400"} ${isLoss ? "animate-pulse" : ""}`}>
              {isLoss ? "-" : "+"}${Math.abs(net).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
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