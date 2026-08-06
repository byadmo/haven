import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

export default function CashFlowChart({ transactions = [] }) {
  const data = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 3; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      let inflow = 0;
      let outflow = 0;
      transactions.forEach((t) => {
        const d = parseISO(t.date);
        if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
          if (t.type === "income") inflow += t.amount;
          else outflow += t.amount;
        }
      });
      months.push({
        label: format(monthStart, "MMM"),
        inflow: Math.round(inflow),
        outflow: Math.round(outflow),
        net: Math.round(inflow - outflow),
      });
    }
    return months;
  }, [transactions]);

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={6}>
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
            formatter={(v) => `$${v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}
          />
          <Legend wrapperStyle={{ fontSize: "13px" }} />
          <Bar dataKey="inflow" name="Inflow" fill="#22c55e" radius={[6, 6, 0, 0]} />
          <Bar dataKey="outflow" name="Outflow" fill="#f97316" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}