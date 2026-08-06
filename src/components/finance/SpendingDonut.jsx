import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

const COLORS = ["#6366f1", "#818cf8", "#a5b4fc", "#22d3ee", "#34d399", "#f59e0b", "#f472b6", "#94a3b8"];

export default function SpendingDonut({ transactions }) {
  const [hover, setHover] = useState(null);
  const data = useMemo(() => {
    const now = new Date();
    const ms = now.getMonth(), ys = now.getFullYear();
    const map = new Map();
    (transactions || []).forEach((t) => {
      if (t.type !== "expense" || !t.date) return;
      const d = new Date(t.date + "T00:00:00");
      if (d.getMonth() !== ms || d.getFullYear() !== ys) return;
      const cat = t.category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + (t.amount || 0));
    });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <PieIcon className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Spending by Category</p>
      </div>
      {data.length ? (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative" style={{ width: 150, height: 150 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={1} stroke="none" onMouseEnter={(_, i) => setHover(i)}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#fff" }}
                  formatter={(v) => `$${Number(v).toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-widest text-white/40">This month</p>
                <p className="text-lg font-bold font-mono tabular-nums text-zinc-50">${total.toFixed(0)}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full space-y-1.5 max-h-[150px] overflow-y-auto no-scrollbar">
            {data.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-white/70 truncate">{d.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                  <span className="text-white/40">{total ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
                  <span className="text-zinc-100">${d.value.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/30 text-center py-10">No spending data this month.</p>
      )}
    </div>
  );
}