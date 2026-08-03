import React from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

const money = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });
const kFmt = (v) => `$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "k" : Math.round(v)}`;

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs">
      <p className="text-white/50 uppercase tracking-widest mb-1">{p.payload.category}</p>
      <p className="font-mono tabular-nums text-rose-400">{money(p.value)}</p>
    </div>
  );
}

export default function CategoryBreakdownChart({ data, monthLabel }) {
  return (
    <div className="rounded-lg bg-black border border-white/10 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-widest text-white/50">Top Expense Categories</h3>
        <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">{monthLabel}</span>
      </div>
      {data.length === 0 ? (
        <p className="text-xs uppercase tracking-widest text-white/30 text-center py-16">No expenses logged this month.</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34 + 16)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 12, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} tickFormatter={kFmt} />
            <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} width={120} />
            <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="amount" name="Spending" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}