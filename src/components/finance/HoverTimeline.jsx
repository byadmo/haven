import React from "react";
import { format } from "date-fns";
import { useForecast } from "@/lib/forecast-context";

// Hover-driven forecast timeline: move the pointer across the track to sweep
// the playhead. Touch works too (drag finger). No press/drag needed.
const SNAP = 1.4;

function relativeLabel(month) {
  if (month === 0) return "Now";
  if (month < 12) return `${month} mo`;
  const y = Math.floor(month / 12);
  const m = month % 12;
  return m ? `${y}y ${m}m` : `${y}y`;
}

export default function HoverTimeline() {
  const fc = useForecast();
  const series = fc?.forecastData;
  const ref = React.useRef(null);

  if (!series?.length) return null;

  const max = series.length - 1;
  const index = fc.timelineIndex;
  const onIndex = fc.setTimelineIndex;
  const keyframes = fc.keyframes || [];

  function snap(raw) {
    let best = Math.round(raw);
    let bestDist = SNAP;
    keyframes.forEach((k) => {
      const d = Math.abs(k - raw);
      if (d <= bestDist) { bestDist = d; best = k; }
    });
    return Math.max(0, Math.min(max, best));
  }

  function indexFromX(clientX) {
    const rect = ref.current.getBoundingClientRect();
    let r = (clientX - rect.left) / rect.width;
    r = Math.max(0, Math.min(1, r));
    return Math.round(r * max);
  }

  function onMove(e) { onIndex(snap(indexFromX(e.clientX))); }
  function onLeave() { onIndex(0); }
  function onWheel(e) {
    const d = e.deltaY || e.deltaX;
    if (!d) return;
    onIndex(snap(index + (d > 0 ? 1 : -1)));
  }

  const pct = (m) => `${(m / max) * 100}%`;
  const yearTicks = Array.from({ length: Math.floor(max / 12) + 1 }, (_, i) => i * 12).filter((y) => y <= max);
  const point = fc.point;
  const lastPoint = series[max];
  const debtFree = lastPoint?.keyframe && lastPoint?.keyframeLabel === "DEBT FREE";

  return (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[0.25em] text-white/50 font-mono uppercase">Drag the slider to preview your future</span>
        <span className={`text-[10px] tracking-[0.18em] font-mono ${point?.keyframe ? "text-emerald-400" : "text-white/40"}`}>
          {point?.keyframe
            ? `◉ ${point.keyframeLabel}`
            : index === 0 ? "○ Now" : `○ ${relativeLabel(index)} · ${format(series[index].date, "MMM yyyy")}`}
        </span>
      </div>

      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onWheel={onWheel}
        className="relative h-12 select-none touch-none cursor-ew-resize"
        role="slider"
        aria-label="Forecast timeline"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={index}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onIndex(snap(index - 1));
          if (e.key === "ArrowRight") onIndex(snap(index + 1));
        }}
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/10" />
        {yearTicks.map((y) => (
          <div key={y} className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-white/15" style={{ left: pct(y) }} />
        ))}
        {keyframes.map((k) => (
          <div key={k} className="absolute top-1/2 -translate-y-1/2" style={{ left: pct(k) }}>
            <div className="w-px h-4 bg-emerald-400" />
          </div>
        ))}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: pct(index) }}
        >
          <div className="w-0.5 h-6 bg-emerald-400/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-400 -mt-1" />
        </div>
      </div>

      <div className="flex justify-between mt-1 font-mono tabular-nums tracking-tight text-[9px] tracking-wider text-white/30 uppercase">
        <span>Now · {format(series[0].date, "MMM yyyy")}</span>
        <span>{debtFree ? "Debt Free · " : ""}{format(series[max].date, "MMM yyyy")}</span>
      </div>
    </div>
  );
}