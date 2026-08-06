import React from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useCurrency } from "@/lib/currency-context";

function Tip({ active, payload, label }) {
  const { fmtMoney } = useCurrency();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs">
      <p className="text-white/50 uppercase tracking-widest mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono tabular-nums" style={{ color: p.color || p.fill }}>
          {p.name}: {fmtMoney(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function IncomeVsSpendingChart({ data }) {
  const { fmtAxis } = useCurrency();
  return (
    <div className="rounded-lg bg-black border border-white/10 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-widest text-white/50">Income vs Spending</h3>
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">6-month trend</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} tickFormatter={fmtAxis} width={48} />
          <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="income" name="Income" fill="var(--th-success, #10b981)" radius={[4, 4, 0, 0]} barSize={16} />
          <Bar dataKey="spending" name="Spending" fill="var(--th-danger, #f43f5e)" radius={[4, 4, 0, 0]} barSize={16} />
          <Line dataKey="savings" name="Net Savings" stroke="var(--th-primary, #6366f1)" strokeWidth={2} dot={{ r: 3, fill: "var(--th-primary, #6366f1)" }} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3 text-[10px] uppercase tracking-widest text-white/40 font-mono">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--th-success, #10b981)" }} />Income</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: "var(--th-danger, #f43f5e)" }} />Spending</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-sm" style={{ background: "var(--th-primary, #6366f1)" }} />Savings</span>
      </div>
    </div>
  );
}