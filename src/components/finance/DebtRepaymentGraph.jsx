import React from "react";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const PALETTE = [
  "#f43f5e", "#6366f1", "#f59e0b", "#10b981",
  "#3b82f6", "#a855f7", "#ec4899", "#22d3ee",
];

export default function DebtRepaymentGraph({ debts }) {
  const [payments, setPayments] = React.useState([]);

  React.useEffect(() => {
    base44.entities.DebtPayment.list("-date", 1000)
      .then(setPayments)
      .catch(() => {});
  }, [debts]);

  const { data, series } = React.useMemo(() => {
    if (!payments.length || !debts.length) return { data: [], series: [] };
    const sorted = [...payments].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const dates = [...new Set(sorted.map((p) => p.date))].sort();

    const series = debts
      .map((d) => {
        const dps = sorted.filter((p) => p.debt_id === d.id);
        let cum = 0;
        let i = 0;
        const map = {};
        for (const dt of dates) {
          while (i < dps.length && (dps[i].date || "") <= dt) {
            cum += dps[i].amount || 0;
            i++;
          }
          map[dt] = cum;
        }
        return { id: d.id, name: d.name, map };
      })
      .filter((s) => Object.values(s.map).some((v) => v > 0));

    const data = dates.map((dt) => {
      const row = { date: dt };
      series.forEach((s) => { row[s.id] = s.map[dt] || 0; });
      return row;
    });

    return { data, series };
  }, [payments, debts]);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 flex items-center justify-center bg-emerald-500/10">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-zinc-100">Debt Payoff Trend</h3>
          <p className="text-[10px] uppercase tracking-widest text-white/50">
            Cumulative paid off per liability
          </p>
        </div>
      </div>

      {series.length === 0 ? (
        <p className="text-xs uppercase tracking-widest text-white/40 text-center py-8">
          No payments logged yet — log a payment to see your trend.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(d) => format(parseISO(d), "MMM yy")}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            />
            <YAxis
              tickFormatter={(v) => fmt(v)}
              stroke="rgba(255,255,255,0.3)"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "#000",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "rgba(255,255,255,0.5)" }}
              labelFormatter={(l) => format(parseISO(l), "MMM d, yyyy")}
              formatter={(v) => fmt(v)}
            />
            <Legend
              wrapperStyle={{ fontSize: 10 }}
              iconType="plainline"
            />
            {series.map((s, idx) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={s.id}
                name={s.name}
                stroke={PALETTE[idx % PALETTE.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}