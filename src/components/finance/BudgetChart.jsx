import React from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

const SLICE = ["#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#f472b6", "#a3e635", "#94a3b8"];

export default function BudgetChart({ bills, incomeTotal, spendingTotal, leftover, fmt }) {
  const [view, setView] = React.useState("bar");
  const billCount = bills.length;

  const barData = [
    { name: "Income", value: Math.max(incomeTotal, 0), fill: "#34d399" },
    { name: "Bills", value: Math.max(spendingTotal, 0), fill: "#fb7185" },
    { name: "Leftover", value: Math.abs(leftover), fill: leftover >= 0 ? "#22d3ee" : "#fb7185" },
  ];

  const pieData = [
    ...bills.map((b) => ({ name: b.name || "Unnamed", value: Math.max(b.amount, 0) })),
    ...(leftover > 0 ? [{ name: "Leftover", value: leftover }] : []),
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Budget breakdown</h3>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)}>
          <ToggleGroupItem value="bar" aria-label="Bar"><BarChart3 className="h-4 w-4" /></ToggleGroupItem>
          <ToggleGroupItem value="pie" aria-label="Pie"><PieChartIcon className="h-4 w-4" /></ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {view === "bar" ? (
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#000", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#000", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }} />
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={95} paddingAngle={2}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={i < billCount ? SLICE[i % SLICE.length] : "#22d3ee"} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {view === "pie" && pieData.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {pieData.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i < billCount ? SLICE[i % SLICE.length] : "#22d3ee" }} />
              <span className="text-zinc-300">{d.name}</span>
              <span className="tabular-nums text-zinc-500">{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}