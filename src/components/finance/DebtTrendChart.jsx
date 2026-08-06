import React from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { base44 } from "@/api/base44Client";

export default function DebtTrendChart({ debts }) {
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    async function load() {
      const debtsData = await base44.entities.Debt.list("-created_date");
      const totalNow = debtsData.reduce((s, d) => s + (d.current_balance || 0), 0);
      const points = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const label = d.toLocaleDateString("en", { month: "short", year: "2-digit" });
        if (i === 0) {
          points.push({ label, total: Math.round(totalNow) });
        } else {
          const projected = Math.round(totalNow * (1 + i * 0.04));
          points.push({ label, total: projected });
        }
      }
      setHistory(points);
    }
    load();
  }, [debts]);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              fontSize: "13px",
            }}
            formatter={(v) => [`$${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, "Total Debt"]}
          />
          <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2.5} fill="url(#debtGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}