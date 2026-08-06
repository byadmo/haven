import React, { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { percentToLetter } from "@/lib/eduGrading";

const LETTER_MIN = { "A": 90, "A-": 85, "B+": 80, "B": 75, "B-": 70, "C+": 65, "C": 60, "C-": 55, "D": 50 };

export default function GradeCalculator({ course, deliverables }) {
  const dlvs = deliverables || [];
  const [hyp, setHyp] = useState({});
  const [target, setTarget] = useState("B");

  const { earnedPts, earnedW, remaining } = useMemo(() => {
    let ep = 0, ew = 0;
    const rem = [];
    dlvs.forEach((d) => {
      if (d.graded && d.grade != null) { ep += (d.grade / 100) * (d.weight || 0); ew += d.weight || 0; }
      else rem.push(d);
    });
    return { earnedPts: ep, earnedW: ew, remaining: rem };
  }, [dlvs]);

  const remW = remaining.reduce((s, d) => s + (d.weight || 0), 0);
  const hypPts = remaining.reduce((s, d) => s + ((hyp[d.id] != null ? hyp[d.id] : 0) / 100) * (d.weight || 0), 0);
  const totalW = earnedW + remW;
  const projected = totalW > 0 ? ((earnedPts + hypPts) / totalW) * 100 : null;
  const currentPct = earnedW > 0 ? (earnedPts / earnedW) * 100 : null;

  const targetMin = LETTER_MIN[target] ?? 75;
  const neededAvg = remW > 0 ? (((targetMin / 100) * totalW - earnedPts) / remW) * 100 : null;
  const allGraded = dlvs.length > 0 && remaining.length === 0;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">What-If Grade Calculator</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-md border border-white/10 p-2.5">
          <p className="text-[9px] uppercase tracking-widest text-white/40">Current</p>
          <p className="text-lg font-bold font-mono tabular-nums text-zinc-100">{currentPct != null ? `${currentPct.toFixed(1)}%` : "—"}</p>
        </div>
        <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-2.5">
          <p className="text-[9px] uppercase tracking-widest text-emerald-400/70">Projected</p>
          <p className="text-lg font-bold font-mono tabular-nums text-emerald-300">{projected != null ? `${projected.toFixed(1)}%` : "—"}</p>
        </div>
      </div>

      {allGraded ? (
        <p className="text-xs text-white/50 leading-snug">
          All deliverables graded. Final grade: <span className="text-emerald-300 font-mono">{projected != null ? `${projected.toFixed(1)}%` : "—"}</span> ({percentToLetter(projected)}).
        </p>
      ) : (
        <>
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5">Assume grades for remaining ({remaining.length})</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar mb-3">
            {remaining.map((d) => (
              <div key={d.id} className="flex items-center gap-2">
                <span className="text-[11px] text-white/60 flex-1 truncate">{d.title} ({d.weight}%)</span>
                <input
                  type="range" min={0} max={100} step={1}
                  value={hyp[d.id] != null ? hyp[d.id] : 50}
                  onChange={(e) => setHyp((p) => ({ ...p, [d.id]: Number(e.target.value) }))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-[11px] font-mono tabular-nums text-emerald-300 w-8 text-right">{hyp[d.id] != null ? hyp[d.id] : 50}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px] mb-2">
            <span className="text-white/50">Target grade:</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-7 rounded border border-white/10 bg-black px-1 text-xs text-white">
              {Object.keys(LETTER_MIN).map((l) => <option key={l} value={l}>{l} ({LETTER_MIN[l]}%)</option>)}
            </select>
          </div>
          <p className="text-[11px] text-white/60 leading-snug border-t border-white/5 pt-2">
            You need an average of{" "}
            <span className="font-mono tabular-nums text-emerald-300">{neededAvg != null ? `${Math.max(0, neededAvg).toFixed(1)}%` : "—"}</span>
            {" "}on remaining items for a <span className="text-emerald-300 font-semibold">{target}</span>.
          </p>
        </>
      )}
    </div>
  );
}