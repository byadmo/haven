import React, { useMemo } from "react";
import { Moon, BookOpen, GraduationCap, AlertTriangle } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";

// Parse weekly class hours from course schedule
function parseScheduleHours(c) {
  const days = Array.isArray(c.schedule_days) ? c.schedule_days : [];
  if (!days.length || !c.schedule_time) return 0;
  const m = String(c.schedule_time).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!m) return 0;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  if (end <= start) return 0;
  const perSession = (end - start) / 60;
  return Math.round(perSession * days.length * 10) / 10;
}

const LEVELS = [
  { label: "Optimal", color: "emerald" },
  { label: "Moderate", color: "amber" },
  { label: "Stretched", color: "orange" },
  { label: "Critical", color: "rose" },
];

export function calculateWorkload(courses, studySessions, weeklyMinutes, sleep = 8) {
  const totalCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
  const targetStudy = courses.reduce((s, c) => s + (c.target_weekly_hours || 0), 0);
  const classHours = courses.reduce((s, c) => {
    const sh = parseScheduleHours(c);
    return s + (sh > 0 ? sh : Math.round(c.credits || 0));
  }, 0);

  const hoursPerWeek = 168; // 24*7
  const sleepWeekly = sleep * 7;
  const classWeekly = classHours;
  const studyWeekly = targetStudy || Math.round(totalCredits * 3); // 3h per credit if not set
  const actualStudyWeekly = weeklyMinutes > 0 ? weeklyMinutes / 60 : studyWeekly;
  const totalCommitted = classWeekly + studyWeekly + sleepWeekly;
  const remainingFree = hoursPerWeek - totalCommitted;
  const freeForWork = Math.max(0, remainingFree);
  const maxWorkWeekly = Math.min(40, freeForWork);

  // Burnout risk: ratio of committed to available hours
  const committedRatio = totalCommitted / hoursPerWeek;
  let riskLevel, riskColor;
  if (committedRatio < 0.55) { riskLevel = "low"; riskColor = "emerald"; }
  else if (committedRatio < 0.65) { riskLevel = "moderate"; riskColor = "amber"; }
  else if (committedRatio < 0.75) { riskLevel = "high"; riskColor = "orange"; }
  else { riskLevel = "critical"; riskColor = "rose"; }

  // Daily study needed to hit target
  const daysLeft = 7;
  const actualThisWeek = actualStudyWeekly;
  const targetDaily = targetStudy > 0 ? targetStudy / 7 : 0;
  const gap = targetStudy - actualThisWeek;
  const catchupDaily = gap > 0 ? gap / daysLeft : 0;

  return {
    totalCredits,
    classWeekly,
    studyWeekly: targetStudy,
    actualStudyWeekly: +actualStudyWeekly.toFixed(1),
    sleepWeekly,
    totalCommitted,
    remainingFree: +Math.max(0, remainingFree).toFixed(1),
    maxWorkWeekly: +maxWorkWeekly.toFixed(1),
    committedRatio: +(committedRatio * 100).toFixed(0),
    riskLevel,
    riskColor,
    gap: +gap.toFixed(1),
    catchupDaily: +catchupDaily.toFixed(1),
    targetDaily: +targetDaily.toFixed(1),
    actualDaily: courses.length > 0 ? +(actualThisWeek / 7).toFixed(1) : 0,
  };
}

export default function WorkloadAnalyzer() {
  const { courses, studySessions, weeklyMinutes, settings } = useEduSync();
  const sleep = settings?.weekly_sleep_hours ? Math.round(settings.weekly_sleep_hours / 7) : 8;

  const wl = useMemo(() => calculateWorkload(courses, studySessions, weeklyMinutes, sleep), [courses, studySessions, weeklyMinutes, sleep]);

  const riskStyles = {
    low: { bg: "bg-emerald-500/10", border: "border-emerald-400/30", text: "text-emerald-300", dot: "bg-emerald-400", label: "Low Risk — Sustainable pace" },
    moderate: { bg: "bg-amber-500/10", border: "border-amber-400/30", text: "text-amber-300", dot: "bg-amber-400", label: "Moderate — Watch your load" },
    high: { bg: "bg-orange-500/10", border: "border-orange-400/30", text: "text-orange-300", dot: "bg-orange-400", label: "High — Risk of burnout" },
    critical: { bg: "bg-rose-500/10", border: "border-rose-400/30", text: "text-rose-300", dot: "bg-rose-400", label: "Critical — Overloaded" },
  };

  const s = riskStyles[wl.riskLevel] || riskStyles.low;

  return (
    <div className="rounded-xl border border-white/10 bg-black p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-emerald-400" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Workload Analysis</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <MetricBox icon={BookOpen} label="Class" value={`${wl.classWeekly}h`} sub="/ wk" />
        <MetricBox icon={GraduationCap} label="Study" value={`${wl.actualStudyWeekly}h`} sub={`target ${wl.studyWeekly}h`} />
        <MetricBox icon={Moon} label="Sleep" value={`${wl.sleepWeekly}h`} sub="/ wk" />
      </div>

      {/* Commitment Bar */}
      <div>
        <div className="flex justify-between text-[10px] text-white/40 mb-1">
          <span>Weekly commitment</span>
          <span className="font-mono">{wl.committedRatio}% of 168h</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, wl.committedRatio)}%`,
              background: wl.riskLevel === "low"
                ? "linear-gradient(90deg, #34d399, #00E5A0)"
                : wl.riskLevel === "moderate"
                  ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                  : "linear-gradient(90deg, #f97316, #ef4444)",
            }}
          />
        </div>
      </div>

      {/* Burnout Risk */}
      <div className={`rounded-lg border p-3 ${s.bg} ${s.border}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`} />
          <div>
            <p className={`text-[10px] uppercase tracking-widest font-semibold ${s.text}`}>{s.label}</p>
            <p className="text-[11px] text-white/60 mt-0.5">
              {wl.gap > 0
                ? `Study gap: ${wl.gap}h this week — need ${wl.catchupDaily}h/day to catch up`
                : "On track with your study targets"}
            </p>
          </div>
        </div>
      </div>

      {/* Daily recommendation */}
      {wl.targetDaily > 0 && (
        <div className="text-[11px] text-white/40 space-y-1">
          <div className="flex justify-between">
            <span>Recommended daily study</span>
            <span className="font-mono text-white/70">{wl.targetDaily}h</span>
          </div>
          <div className="flex justify-between">
            <span>Your average (this week)</span>
            <span className={`font-mono ${wl.actualDaily >= wl.targetDaily ? "text-emerald-300" : "text-amber-300"}`}>{wl.actualDaily}h</span>
          </div>
          {wl.maxWorkWeekly > 0 && (
            <div className="flex justify-between">
              <span>Max part-time work</span>
              <span className="font-mono text-white/70">{wl.maxWorkWeekly}h/week</span>
            </div>
          )}
        </div>
      )}

      {/* Warning if critical */}
      {wl.riskLevel === "critical" && (
        <div className="flex items-start gap-2 text-[10px] text-rose-300/80">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Your schedule is critically overloaded. Consider reducing your course load, cutting back on work hours,
            or adjusting study targets to prevent burnout.
          </span>
        </div>
      )}
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
      <Icon className="h-3.5 w-3.5 text-white/30 mb-1" />
      <p className="text-base font-semibold font-mono tabular-nums text-white">{value}</p>
      <p className="text-[8px] uppercase tracking-widest text-white/30">{label} {sub && <span className="text-white/20">{sub}</span>}</p>
    </div>
  );
}