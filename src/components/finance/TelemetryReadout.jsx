import React from "react";
import { format } from "date-fns";
import { useForecast } from "@/lib/forecast-context";

const money = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

function toneColor(tone) {
  return tone === "emerald" ? "text-emerald-400"
    : tone === "amber" ? "text-amber-400"
    : tone === "rose" ? "text-rose-400" : "text-zinc-100";
}

function Metric({ label, value, tone, badge }) {
  return (
    <div className="p-4 sm:p-5 flex-1">
      <p className="text-[10px] tracking-[0.2em] text-white/50 font-mono uppercase">{label}</p>
      <p className={`mt-1 text-xl sm:text-3xl font-mono tabular-nums tracking-tight ${toneColor(tone)}`}>{value}</p>
      {badge && (
        <span className="mt-1.5 inline-block text-[9px] tracking-[0.18em] px-1.5 py-0.5 border border-emerald-500/40 text-emerald-400 font-mono">
          {badge}
        </span>
      )}
    </div>
  );
}

export default function TelemetryReadout() {
  const fc = useForecast();
  const point = fc?.point;
  if (!point) return null;
  const nw = point.netWorth || 0;
  const debt = point.debtRemaining || 0;
  const buf = point.cashBuffer || 0;

  return (
    <div className="flex flex-col sm:flex-row sm:items-stretch divide-y sm:divide-y-0 sm:divide-x divide-white/10">
      <div className="p-4 sm:p-5">
        <p className="text-[10px] tracking-[0.2em] text-white/50 font-mono uppercase">Forecast</p>
        <p className="mt-1 text-xl sm:text-2xl font-mono tabular-nums tracking-tight text-zinc-50">T+{point.month}</p>
        <p className="text-[11px] font-mono tabular-nums tracking-tight text-white/50">{format(point.date, "MMM yyyy").toUpperCase()}</p>
      </div>
      <Metric label="Net Worth" value={money(nw)} tone={nw >= 0 ? "emerald" : "rose"} />
      <Metric label="Debt Remaining" value={money(debt)} tone={debt <= 0 ? "emerald" : "amber"} />
      <Metric label="Cash Balance" value={money(point.cashBalance || 0)} tone={(point.cashBalance || 0) < 0 ? "rose" : "emerald"} />
      <Metric label="Monthly Net" value={money(point.monthlyNet || 0)} tone={(point.monthlyNet || 0) < 0 ? "rose" : "emerald"} />
      <Metric label="Cash Buffer" value={money(buf)} tone={buf < 0 ? "amber" : "emerald"} badge={point.keyframe && point.keyframeLabel ? point.keyframeLabel : null} />
    </div>
  );
}