import React from "react";
import { useForecast } from "@/lib/forecast-context";

// Magnetic snap distance (in months) — snaps the playhead to a keyframe.
const SNAP = 1.4;

export default function ScrubbableTimeline() {
  const fc = useForecast();
  const series = fc?.forecastData;
  if (!series?.length) return null;

  const max = series.length - 1;
  const index = fc.timelineIndex;
  const onIndex = fc.setTimelineIndex;
  const point = fc.point;
  const keyframes = fc.keyframes || [];

  function snap(raw) {
    let best = Math.round(raw);
    let bestDist = SNAP;
    keyframes.forEach((k) => {
      const d = Math.abs(k - raw);
      if (d <= bestDist) {
        bestDist = d;
        best = k;
      }
    });
    return Math.max(0, Math.min(max, best));
  }

  const pct = (m) => `${(m / max) * 100}%`;
  const yearTicks = Array.from({ length: Math.floor(max / 12) + 1 }, (_, i) => i * 12).filter((y) => y <= max);

  return (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[0.25em] text-white/50 font-mono uppercase">Timeline · Scrub to Forecast</span>
        <span className={`text-[10px] tracking-[0.18em] font-mono ${point?.keyframe ? "text-emerald-400" : "text-white/40"}`}>
          {point?.keyframe ? `◉ ${point.keyframeLabel}` : `○ T+${index}`}
        </span>
      </div>

      <div className="relative h-10 select-none">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
        {yearTicks.map((y) => (
          <div key={y} className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/15" style={{ left: pct(y) }} />
        ))}
        {keyframes.map((k) => (
          <div key={k} className="absolute top-1/2 -translate-y-1/2" style={{ left: pct(k) }}>
            <div className="w-px h-5 bg-emerald-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 -ml-[1px] -mt-[3px]" />
          </div>
        ))}
        <div className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none" style={{ left: pct(index) }}>
          <div className="w-0.5 h-8 bg-emerald-400" />
        </div>
        <input
          type="range"
          min={0}
          max={max}
          value={index}
          onChange={(e) => onIndex(snap(Number(e.target.value)))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize m-0"
          aria-label="Forecast timeline playhead"
        />
      </div>

      <div className="flex justify-between mt-1 font-mono tabular-nums tracking-tight text-[9px] tracking-wider text-white/30 uppercase">
        <span>T+0 Now</span>
        <span>T+{max} · {Math.floor(max / 12)}y Horizon</span>
      </div>
    </div>
  );
}