import React, { useMemo } from "react";
import { AlarmClock } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";

function dayDiff(due) {
  const d = new Date((due || "") + "T00:00:00");
  if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export default function ExamCountdown() {
  const { deliverables, courses } = useEduSync();
  const courseById = useMemo(() => Object.fromEntries((courses || []).map((c) => [c.id, c])), [courses]);

  const exams = useMemo(() => {
    return (deliverables || [])
      .filter((d) => (d.is_exam || (d.type || "").toLowerCase() === "exam") && (d.due_date || "") && !d.completed)
      .map((d) => ({ d, days: dayDiff(d.due_date) }))
      .filter((x) => x.days != null && x.days >= 0)
      .sort((a, b) => a.days - b.days);
  }, [deliverables]);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlarmClock className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Exam Countdown</p>
      </div>
      {exams.length ? (
        <div className="space-y-2">
          {exams.map(({ d, days }) => {
            const c = courseById[d.course_id];
            const color = days > 14 ? "#34d399" : days >= 7 ? "#fbbf24" : "#f87171";
            const cd = new Date((d.created_date || d.due_date) + "T00:00:00");
            const dd = new Date(d.due_date + "T00:00:00");
            const span = Math.max(1, dd - cd);
            const now = new Date();
            const prog = Math.max(0, Math.min(100, ((now - cd) / span) * 100));
            return (
              <div key={d.id} className="rounded-md border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono">{c?.code || "—"}</p>
                    <p className="text-sm text-zinc-100 truncate">{d.title}</p>
                    <p className="text-[10px] text-white/40 font-mono tabular-nums">{d.due_date}{d.due_time ? ` · ${d.due_time}` : ""}</p>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-2xl font-bold font-mono tabular-nums" style={{ color }}>{days}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/40">days</p>
                  </div>
                </div>
                <div className="h-1 bg-white/10 overflow-hidden rounded mt-2">
                  <div className="h-full rounded" style={{ width: `${prog}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/30 text-center py-6">No upcoming exams — enjoy the calm!</p>
      )}
    </div>
  );
}