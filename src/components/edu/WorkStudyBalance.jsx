import React from "react";
import { Moon, BookOpen, GraduationCap, Briefcase, Clock, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEduSync } from "@/lib/eduSyncContext";

// Parse a course's weekly class hours from its schedule_days × schedule_time
// (e.g. "10:00-11:30" on 3 days = 4.5h/wk). Returns 0 if the schedule is
// missing or unparseable — caller falls back to credits in that case.
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

const HEALTH = {
  green: { bg: "bg-emerald-500/10", border: "border-emerald-400/40", text: "text-emerald-300", dot: "bg-emerald-400", label: "Optimal" },
  yellow: { bg: "bg-amber-500/10", border: "border-amber-400/40", text: "text-amber-300", dot: "bg-amber-400", label: "Sub-optimal" },
  red: { bg: "bg-rose-500/10", border: "border-rose-400/40", text: "text-rose-300", dot: "bg-rose-400", label: "Non-optimal" },
};

export default function WorkStudyBalance() {
  const { courses } = useEduSync();
  const defaultCredits = courses.reduce((s, c) => s + (c.credits || 0), 0);
  const defaultStudy = courses.reduce((s, c) => s + (c.target_weekly_hours || 0), 0);
  // Class hours/week from the actual course schedule (days × duration in hours)
  // when set; falls back to credits when a course has no schedule set.
  const defaultClassHours = courses.reduce((s, c) => {
    const sh = parseScheduleHours(c);
    return s + (sh > 0 ? sh : Math.round(c.credits || 0));
  }, 0);

  const [vals, setVals] = React.useState({
    credits: defaultCredits,
    target_study_hours: defaultStudy,
    class_hours: defaultClassHours || Math.round(defaultCredits) || 0,
    sleep_hours_per_day: 8,
  });
  const [result, setResult] = React.useState(null);
  const [loadingResult, setLoadingResult] = React.useState(false);

  // Auto-recalculate credits, study & class hours whenever the user's course
  // list changes (course added / edited / removed). Only the user's sleep-day
  // setting is preserved — credits / study / class hours always reflect the
  // current course data per the user's request.
  React.useEffect(() => {
    setVals((v) => ({
      credits: defaultCredits,
      target_study_hours: defaultStudy,
      class_hours: defaultClassHours || Math.round(defaultCredits) || 0,
      sleep_hours_per_day: v.sleep_hours_per_day || 8,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCredits, defaultStudy, defaultClassHours]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingResult(true);
    const id = setTimeout(async () => {
      try {
        const res = await base44.functions.invoke("workStudyBalance", vals);
        const d = res?.data ?? res;
        if (!cancelled) setResult(d);
      } catch {
        if (!cancelled) setResult(null);
      } finally {
        if (!cancelled) setLoadingResult(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(id); };
  }, [vals]);

  const set = (k, v) => setVals((s) => ({ ...s, [k]: v }));
  const h = result ? HEALTH[result.color] || HEALTH.green : null;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="h-4 w-4 text-sky-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Work-Study Balance</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <NumberField label="Total credits" value={vals.credits} onChange={(v) => set("credits", v)} />
        <NumberField label="Target study / wk" value={vals.target_study_hours} onChange={(v) => set("target_study_hours", v)} />
        <NumberField label="Class hours / wk" value={vals.class_hours} onChange={(v) => set("class_hours", v)} />
        <NumberField label="Sleep / day" value={vals.sleep_hours_per_day} onChange={(v) => set("sleep_hours_per_day", v)} />
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <Box icon={Moon} label="Sleep" value={`${result.sleep_weekly}h`} sub="/ week" />
            <Box icon={BookOpen} label="Class" value={`${result.class_weekly}h`} sub="/ week" />
            <Box icon={GraduationCap} label="Study" value={`${result.study_weekly}h`} sub="/ week" />
            <Box icon={Briefcase} label="Max Work" value={`${result.max_work_weekly}h`} sub="/ week" />
            <Box icon={Clock} label="Free time" value={`${result.remaining_free}h`} sub="/ week" />
          </div>

          <div className={`mt-3 rounded-md border p-3 flex items-center gap-3 ${h ? `${h.bg} ${h.border}` : ""}`}>
            <span className={`h-3 w-3 rounded-full shrink-0 ${h?.dot}`} />
            <div className="min-w-0">
              <p className={`text-[10px] uppercase tracking-widest font-mono ${h?.text}`}>{h?.label}</p>
              <p className="text-xs text-zinc-100 leading-snug">{loadingResult ? "Evaluating…" : result.reason}</p>
            </div>
            {loadingResult && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40 ml-auto shrink-0" />}
          </div>
        </>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-md border border-white/10 bg-black px-2.5 py-1.5 text-sm font-mono tabular-nums text-zinc-50 outline-none focus:border-emerald-400/40"
      />
    </div>
  );
}

function Box({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-md border border-white/10 p-2.5">
      <Icon className="h-3.5 w-3.5 text-white/40 mb-1" />
      <p className="text-lg font-semibold font-mono tabular-nums text-zinc-50">{value}</p>
      <p className="text-[9px] uppercase tracking-widest text-white/40">{label} <span className="text-white/25">{sub}</span></p>
    </div>
  );
}