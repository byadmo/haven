import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

const DAY_LABELS = { M: "M", T: "T", W: "W", Th: "Th", F: "F", S: "S", Su: "Su" };

function daysFromNow(due) {
  if (!due) return null;
  const ms = new Date(due).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}
function badgeColor(days) {
  if (days == null) return "text-white/40 border-white/10";
  if (days < 0) return "text-rose-400 border-rose-400/30";
  if (days < 3) return "text-rose-300 border-rose-400/40 bg-rose-500/10";
  if (days < 7) return "text-amber-300 border-amber-400/40 bg-amber-500/10";
  return "text-emerald-300 border-emerald-400/30";
}

export default function CourseCard({ course, onOpen }) {
  const next = course.next;
  const days = next ? daysFromNow(next.due_date) : null;
  const schedule = (course.schedule_days || []).map((d) => DAY_LABELS[d] || d).join(" ");

  return (
    <button onClick={() => onOpen(course)} className="text-left w-full rounded-lg border border-white/10 bg-black p-4 hover:border-emerald-400/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono">{course.code}</p>
          <p className="text-sm font-semibold text-zinc-100 truncate">{course.title}</p>
          <p className="text-[11px] text-white/40 mt-0.5 truncate">{course.professor_name || "—"}</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-mono shrink-0 ml-2">{course.credits}cr</span>
      </div>

      {(schedule || course.schedule_time) && (
        <p className="text-[11px] text-white/50 font-mono tabular-nums mb-3">{schedule}{course.schedule_time ? ` · ${course.schedule_time}` : ""}{course.location ? ` · ${course.location}` : ""}</p>
      )}

      {next ? (
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Next deliverable</p>
            <p className="text-xs text-zinc-200 truncate">{next.title}</p>
          </div>
          <span className={`shrink-0 ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border font-mono tabular-nums ${badgeColor(days)}`}>
            <Calendar className="h-3 w-3" />{days != null ? (days < 0 ? `${Math.abs(days)}d over` : `${days}d`) : ""}
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-white/30 mb-3">No upcoming deliverables</p>
      )}

      <div>
        <div className="h-1.5 bg-white/10 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${course.progress}%` }} />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-white/40 mt-1 font-mono tabular-nums">{course.completedCount}/{course.totalCount} done · {course.progress}%</p>
      </div>
    </button>
  );
}

export { daysFromNow, badgeColor };