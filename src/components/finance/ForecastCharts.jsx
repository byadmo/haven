import React from "react";
import { format } from "date-fns";
import { useForecast } from "@/lib/forecast-context";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine, Legend,
} from "recharts";

const money0 = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

const PALETTE = ["#f43f5e", "#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#22d3ee"];
const axisProps = {
  stroke: "rgba(255,255,255,0.25)",
  tick: { fontSize: 10 },
  tickLine: false,
  axisLine: { stroke: "rgba(255,255,255,0.1)" },
};
const tooltipProps = {
  contentStyle: { background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "rgba(255,255,255,0.5)" },
  labelFormatter: (m) => `T+${m}`,
};

function Card({ title, subtitle, children, height = 220 }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black p-4">
      <div className="mb-2">
        <h3 className="font-semibold text-sm text-zinc-100">{title}</h3>
        {subtitle && <p className="text-[10px] uppercase tracking-widest text-white/40">{subtitle}</p>}
      </div>
      <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
    </div>
  );
}

export default function ForecastCharts({ series, order }) {
  const fc = useForecast();
  const index = fc?.timelineIndex ?? 0;

  if (!series?.length) return null;

  const netWorthData = series.map((p) => ({ m: p.month, nw: p.netWorth }));
  const debtData = series.map((p) => ({ m: p.month, dr: p.debtRemaining }));

  const ids = (order || []).map((d) => ({ id: d.id || d.name, name: d.name }));
  const liabData = series.map((p) => {
    const row = { m: p.month };
    ids.forEach((d) => { row[d.id] = (p.liabilities?.[d.id] || 0); });
    return row;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Net Worth Projection" subtitle="Cash minus debt · horizon">
        <LineChart data={netWorthData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="m" {...axisProps} />
          <YAxis tickFormatter={money0} width={56} {...axisProps} axisLine={false} />
          <Tooltip formatter={(v) => money0(v)} {...tooltipProps} />
          <ReferenceLine x={index} stroke="#10b981" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="nw" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </Card>

      <Card title="Debt Remaining" subtitle="Total liability balance over time">
        <AreaChart data={debtData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <XAxis dataKey="m" {...axisProps} />
          <YAxis tickFormatter={money0} width={56} {...axisProps} axisLine={false} />
          <Tooltip formatter={(v) => money0(v)} {...tooltipProps} />
          <ReferenceLine x={index} stroke="#f43f5e" strokeDasharray="3 3" />
          <Area type="monotone" dataKey="dr" stroke="#f43f5e" fill="rgba(244,63,94,0.12)" strokeWidth={2} />
        </AreaChart>
      </Card>

      <div className="lg:col-span-2">
        <Card title="Per-Liability Decline" subtitle="Each balance to zero" height={260}>
          <LineChart data={liabData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="m" {...axisProps} />
            <YAxis tickFormatter={money0} width={56} {...axisProps} axisLine={false} />
            <Tooltip formatter={(v) => money0(v)} {...tooltipProps} />
            <ReferenceLine x={index} stroke="rgba(255,255,255,0.3)" strokeDasharray="3 3" />
            <Legend wrapperStyle={{ fontSize: 10 }} iconType="plainline" />
            {ids.map((d, i) => (
              <Line key={d.id} type="monotone" dataKey={d.id} name={d.name}
                stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </Card>
      </div>
    </div>
  );
}