import React, { useMemo, useState } from "react";
import { GraduationCap, TrendingUp, TrendingDown } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";

const SCALE_43 = { "A+": 4.3, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0 };
const SCALE_40 = { "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0 };

function defaultLetterFor(pct) {
  if (pct == null) return null;
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 55) return "C-";
  if (pct >= 50) return "D";
  return "F";
}

function currentPctForCourse(dlvs) {
  const graded = (dlvs || []).filter((d) => d.graded && d.grade != null && d.weight > 0);
  if (!graded.length) return null;
  const tw = graded.reduce((s, d) => s + d.weight, 0);
  const earned = graded.reduce((s, d) => s + (d.grade / (d.max_grade || 100)) * 100 * d.weight, 0);
  return tw > 0 ? earned / tw : null;
}

export default function GpaProjection() {
  const { courses, cumulativeGpa, deliverablesByCourse } = useEduSync();
  const [scaleId, setScaleId] = useState("4.3");
  const scale = scaleId === "4.3" ? SCALE_43 : SCALE_40;
  const letters = Object.keys(scale);
  const [proj, setProj] = useState({});

  const courseRows = useMemo(() => courses.map((c) => {
    const pct = currentPctForCourse(deliverablesByCourse[c.id]);
    return { c, credits: c.credits || 3, pct, earnedLetter: defaultLetterFor(pct) };
  }), [courses, deliverablesByCourse]);

  const letterFor = (row) => proj[row.c.id] ?? row.earnedLetter ?? "B";

  const projectedGpa = useMemo(() => {
    let pts = 0, credits = 0;
    courseRows.forEach((row) => {
      const pt = scale[letterFor(row)] ?? 0;
      pts += pt * row.credits;
      credits += row.credits;
    });
    return credits > 0 ? +(pts / credits).toFixed(2) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseRows, proj, scale]);

  const trendUp = projectedGpa != null && cumulativeGpa != null ? projectedGpa >= cumulativeGpa : null;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-emerald-300" />
          <p className="text-[10px] uppercase tracking-widest text-white/50">GPA Projection</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-white/10 overflow-hidden">
          {["4.3", "4.0"].map((s) => (
            <button key={s} onClick={() => setScaleId(s)}
              className={`px-2 py-1 text-[10px] font-mono ${scaleId === s ? "bg-emerald-500/15 text-emerald-200" : "text-white/40 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-md border border-white/10 p-3">
          <p className="text-[9px] uppercase tracking-widest text-white/40">Current GPA</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-zinc-100">{cumulativeGpa != null ? cumulativeGpa.toFixed(2) : "—"}</p>
        </div>
        <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-3">
          <p className="text-[9px] uppercase tracking-widest text-emerald-400/70">Projected GPA</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold font-mono tabular-nums text-emerald-300">{projectedGpa != null ? projectedGpa.toFixed(2) : "—"}</p>
            {trendUp != null && projectedGpa != null && cumulativeGpa != null && (
              <span className={`inline-flex items-center gap-0.5 text-xs font-mono tabular-nums ${trendUp ? "text-emerald-300" : "text-rose-300"}`}>
                {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {projectedGpa >= cumulativeGpa ? "+" : ""}{(projectedGpa - cumulativeGpa).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5">Current semester — "What if I get…"</p>
      {courseRows.length ? (
        <div className="space-y-1.5">
          {courseRows.map((row) => (
            <div key={row.c.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono">{row.c.code} · {row.credits}cr</p>
                <p className="text-xs text-zinc-100 truncate">{row.c.title}</p>
              </div>
              {row.pct != null && <span className="text-[10px] text-white/40 font-mono tabular-nums shrink-0">{row.pct.toFixed(0)}% →</span>}
              <select value={letterFor(row)} onChange={(e) => setProj((p) => ({ ...p, [row.c.id]: e.target.value }))}
                className="h-7 rounded border border-white/10 bg-black px-1 text-xs text-white shrink-0">
                {letters.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-white/30 py-3 text-center">No courses this semester.</p>}

      <p className="text-[10px] text-white/30 mt-3 border-t border-white/5 pt-2 leading-snug">
        Scale ({scaleId}): {letters.map((l) => `${l}=${scale[l]}`).join(" · ")}
      </p>
    </div>
  );
}