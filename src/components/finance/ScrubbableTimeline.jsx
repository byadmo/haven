import React from "react";
import { useForecast } from "@/lib/forecast-context";

// Magnetic snap distance (in months) — snaps the playhead to a keyframe.
const SNAP = 1.4;

export default function ScrubbableTimeline() {
  const fc = useForecast();
  const series = fc?.forecastData;
  const trackRef = React.useRef(null);
  const dragging = React.useRef(false);

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

  function indexFromX(clientX) {
    const rect = trackRef.current.getBoundingClientRect();
    let r = (clientX - rect.left) / rect.width;
    r = Math.max(0, Math.min(1, r));
    return Math.round(r * max);
  }

  function onPointerDown(e) {
    dragging.current = true;
    trackRef.current.setPointerCapture(e.pointerId);
    onIndex(snap(indexFromX(e.clientX)));
  }
  function onPointerMove(e) {
    if (!dragging.current) return;
    onIndex(snap(indexFromX(e.clientX)));
  }
  function onPointerUp(e) {
    dragging.current = false;
    try { trackRef.current.releasePointerCapture(e.pointerId); } catch {}
  }
  function onWheel(e) {
    // horizontal/vertical scroll wheel nudges the playhead
    const delta = e.deltaY || e.deltaX;
    if (!delta) return;
    onIndex(snap(index + (delta > 0 ? 1 : -1)));
  }

  const pct = (m) => `${(m / max) * 100}%`;
  const yearTicks = Array.from({ length: Math.floor(max / 12) + 1 }, (_, i) => i * 12).filter((y) => y <= max);

  return (
    <div className="border-t border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-[0.25em] text-white/50 font-mono uppercase">Timeline · Drag to Forecast</span>
        <span className={`text-[10px] tracking-[0.18em] font-mono ${point?.keyframe ? "text-emerald-400" : "text-white/40"}`}>
          {point?.keyframe ? `◉ ${point.keyframeLabel}` : `○ T+${index}`}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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

        {/* hover highlight strip */}
        <div className="absolute top-1/2 -translate-y-1/2 w-px h-5 bg-white/20 opacity-0 hover:opacity-100" style={{ left: pct(index) }} />

        {/* draggable playhead */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
          style={{ left: pct(index) }}
        >
          <div className="w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)] transition-transform active:scale-110" />
          <div className="w-0.5 h-6 -mt-1 bg-emerald-400/80" />
        </div>
      </div>

      <div className="flex justify-between mt-1 font-mono tabular-nums tracking-tight text-[9px] tracking-wider text-white/30 uppercase">
        <span>T+0 Now</span>
        <span>T+{max} · {Math.floor(max / 12)}y Horizon</span>
      </div>
    </div>
  );
}