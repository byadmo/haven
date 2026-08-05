import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { simulateTimeline } from "@/lib/debtStrategy";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Wand2 } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

function ChartTooltip({ active, payload, label }) {
  const { fmtMoney: fmt } = useCurrency();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/95 backdrop-blur px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400 mb-1.5">Month {label}</p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          className="text-xs font-medium tabular-nums"
          style={{ color: p.color }}
        >
          {p.dataKey === "current" ? "Current path" : `Optimized (+boost)`}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function DebtProjectionChart({ debts, surplus }) {
  const { fmtMoney: fmt, fmtAxis } = useCurrency();
  const [method, setMethod] = React.useState("avalanche");

  const base = React.useMemo(
    () => simulateTimeline(debts, surplus, method),
    [debts, surplus, method]
  );

  const maxMonths = Math.max(base.series.length, 1);
  const data = [];
  for (let i = 0; i <= maxMonths; i++) {
    const b = base.series[i] ? base.series[i].balance : 0;
    data.push({ month: i, current: Math.max(0, b) });
  }

  return (
    <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-2xl shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center">
            <Wand2 className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-zinc-100">Payoff Projection</h2>
            <p className="text-xs text-zinc-500">Total debt declining to zero over time</p>
          </div>
        </div>
        <ToggleGroup
          type="single"
          value={method}
          onValueChange={(v) => v && setMethod(v)}
          className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-1 self-start"
        >
          <ToggleGroupItem
            value="avalanche"
            className="data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50 text-zinc-400 px-3 py-1.5 text-xs rounded-md"
          >
            Avalanche
          </ToggleGroupItem>
          <ToggleGroupItem
            value="snowball"
            className="data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50 text-zinc-400 px-3 py-1.5 text-xs rounded-md"
          >
            Snowball
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="optFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, maxMonths]}
              allowDecimals={false}
              stroke="#52525b"
              fontSize={11}
              tickFormatter={(m) => `${m}mo`}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#52525b"
              fontSize={11}
              tickFormatter={(v) => fmtAxis(v)}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="current"
              stroke="#f43f5e"
              strokeWidth={2}
              fill="url(#currentFill)"
              name="Current path"
              isAnimationActive
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}