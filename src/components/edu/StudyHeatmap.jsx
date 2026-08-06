import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";

const FRAMES = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => (h % 3 === 0 ? `${h}` : ""));
const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function intensity(minutes, scale) {
  if (!minutes) return "rgba(255,255,255,0.04)";
  return `rgba(52,211,153,${Math.min(1, 0.18 + minutes / scale)})`;
}

export default function StudyHeatmap() {
  const { studySessions } = useEduSync();
  const [frame, setFrame] = useState("week");
  const [anchor, setAnchor] = useState(() => new Date());

  // Build aggregates from sessions using local time.
  const agg = useMemo(() => {
    const byDate = {};          // yyyy-mm-dd -> minutes
    const byDateTime = {};      // yyyy-mm-dd -> [24]
    const byMonth = {};         // yyyy-mm -> minutes
    (studySessions || []).forEach((s) => {
      const d = new Date(s.completed_at);
      const k = localKey(d);
      const mins = s.duration_minutes || 0;
      byDate[k] = (byDate[k] || 0) + mins;
      byMonth[`${d.getFullYear()}-${d.getMonth()}`] = (byMonth[`${d.getFullYear()}-${d.getMonth()}`] || 0) + mins;
      if (!byDateTime[k]) byDateTime[k] = new Array(24).fill(0);
      byDateTime[k][d.getHours()] += mins;
    });
    return { byDate, byDateTime, byMonth };
  }, [studySessions]);

  const { byDate, byDateTime, byMonth } = agg;

  function step(dir) {
    const d = new Date(anchor);
    if (frame === "day") d.setDate(d.getDate() + dir);
    else if (frame === "week") d.setDate(d.getDate() + dir * 7);
    else if (frame === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setAnchor(d);
  }

  // Build the cell model + period total + label.
  const view = useMemo(() => {
    if (frame === "day") {
      const k = localKey(anchor);
      const hours = byDateTime[k] || new Array(24).fill(0);
      const total = hours.reduce((a, b) => a + b, 0);
      return { cells: hours.map((m, h) => ({ key: `${k}-${h}`, minutes: m })), total, label: prettyDate(anchor), scale: 60, kind: "day" };
    }
    if (frame === "week") {
      const start = new Date(anchor); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay());
      const rows = [];
      let total = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(start); day.setDate(start.getDate() + d);
        const k = localKey(day);
        const hours = byDateTime[k] || new Array(24).fill(0);
        total += hours.reduce((a, b) => a + b, 0);
        rows.push({ dow: DOW[d], hours });
      }
      return { rows, total, label: `${prettyDate(start)} – ${prettyDate(new Date(start.getTime() + 6 * 86400000))}`, scale: 60, kind: "week" };
    }
    if (frame === "month") {
      const y = anchor.getFullYear(), m = anchor.getMonth();
      const first = new Date(y, m, 1);
      const gridStart = new Date(first); gridStart.setDate(first.getDate() - first.getDay());
      const rows = [];
      let total = 0;
      for (let w = 0; w < 6; w++) {
        const row = [];
        for (let d = 0; d < 7; d++) {
          const day = new Date(gridStart); day.setDate(gridStart.getDate() + w * 7 + d);
          const inMonth = day.getMonth() === m;
          const k = localKey(day);
          const mins = inMonth ? (byDate[k] || 0) : -1;
          if (inMonth && mins > 0) total += mins;
          row.push({ key: k, minutes: mins, inMonth, day });
        }
        rows.push(row);
      }
      return { rows, total, label: `${MONTHS[m]} ${y}`, scale: 120, kind: "month" };
    }
    // year
    const y = anchor.getFullYear();
    const cells = [];
    let total = 0;
    for (let m = 0; m < 12; m++) {
      const mins = byMonth[`${y}-${m}`] || 0;
      total += mins;
      cells.push({ key: `${y}-${m}`, minutes: mins, label: MONTHS[m] });
    }
    return { cells, total, label: `${y}`, scale: 600, kind: "year" };
  }, [frame, anchor, byDate, byDateTime, byMonth]);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1 rounded-md border border-white/10 p-0.5">
          {FRAMES.map((f) => (
            <button
              key={f.key}
              onClick={() => setFrame(f.key)}
              className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${frame === f.key ? "bg-emerald-500/15 text-emerald-300" : "text-white/50 hover:text-white"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => step(-1)} className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-xs font-mono tabular-nums text-zinc-200 min-w-[140px] text-center">{view.label}</span>
          <button onClick={() => step(1)} className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setAnchor(new Date())} className="text-[10px] uppercase tracking-widest text-emerald-300 hover:text-emerald-200 ml-1">Today</button>
        </div>
      </div>

      {/* Body */}
      {frame === "day" && (
        <div className="overflow-x-auto pb-1">
          <div className="flex items-end gap-1 min-w-[520px]">
            {view.cells.map((c) => (
              <div key={c.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-sm" style={{ height: `${Math.max(4, Math.min(120, c.minutes))}px`, background: intensity(c.minutes, view.scale) }} title={`${c.minutes}m`} />
                <span className="text-[8px] text-white/30">{HOUR_LABELS[Number(c.key.split("-")[3])] ?? ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {frame === "week" && (
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[560px]">
            <div className="flex gap-1 mb-1 pl-5">
              {HOUR_LABELS.map((h, i) => <span key={i} className="flex-1 text-[8px] text-white/30 text-center">{h}</span>)}
            </div>
            <div className="space-y-1">
              {view.rows.map((r, ri) => (
                <div key={ri} className="flex items-center gap-1">
                  <span className="w-4 text-[9px] text-white/40">{r.dow}</span>
                  <div className="flex-1 grid grid-cols-24 gap-0.5" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
                    {r.hours.map((m, h) => (
                      <div key={h} className="h-4 rounded-sm" style={{ background: intensity(m, view.scale) }} title={`${r.dow} ${h}:00 — ${m}m`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {frame === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map((d, i) => <span key={i} className="text-[9px] text-white/30 text-center">{d}</span>)}
          </div>
          <div className="space-y-1">
            {view.rows.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1">
                {row.map((cell) => (
                  <div
                    key={cell.key}
                    className="rounded-sm text-[9px] flex items-center justify-center"
                    style={{
                      height: 28,
                      background: cell.inMonth ? intensity(cell.minutes > 0 ? cell.minutes : 0, view.scale) : "transparent",
                      border: cell.inMonth ? "1px solid rgba(255,255,255,0.06)" : "none",
                      color: cell.minutes > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
                    }}
                    title={cell.inMonth ? `${cell.key}: ${cell.minutes}m` : ""}
                  >
                    {cell.inMonth ? cell.day.getDate() : ""}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {frame === "year" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {view.cells.map((c) => (
            <div key={c.key} className="rounded-md border border-white/10 p-2 flex flex-col items-center" style={{ background: intensity(c.minutes, view.scale) }}>
              <p className="text-[10px] uppercase tracking-widest text-white/60 font-mono">{c.label}</p>
              <p className="text-sm font-semibold font-mono tabular-nums text-zinc-50 mt-0.5">{Math.round(c.minutes)}m</p>
              <p className="text-[9px] text-white/40">{(c.minutes / 60).toFixed(1)}h</p>
            </div>
          ))}
        </div>
      )}

      {/* Legend + total */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-[9px] text-white/30">
          Less
          {[0.05, 0.3, 0.5, 0.75, 1].map((o) => <span key={o} className="h-3 w-3 rounded-sm" style={{ background: `rgba(52,211,153,${o})` }} />)}
          More
        </div>
        <p className="text-[11px] text-zinc-200 font-mono tabular-nums">Total: <span className="text-emerald-300">{Math.round(view.total)}m</span> · {(view.total / 60).toFixed(1)}h</p>
      </div>
    </div>
  );
}

function prettyDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}