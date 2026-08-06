import React, { useMemo, useState } from "react";
import { StickyNote } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return iso; }
}
function fmtDur(m) {
  const h = Math.floor(m / 60), mm = m % 60;
  return h ? `${h}h${mm ? ` ${mm}m` : ""}` : `${m}m`;
}

export default function SessionNotesList({ courseId }) {
  const { studySessions, courses } = useEduSync();
  const courseById = useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c])), [courses]);
  const [filter, setFilter] = useState("");

  const sessions = useMemo(
    () => (studySessions || [])
      .filter((s) => s.notes && String(s.notes).trim())
      .filter((s) => (courseId ? s.course_id === courseId : (!filter || s.course_id === filter)))
      .slice()
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
      .slice(0, courseId ? 30 : 60),
    [studySessions, courseId, filter]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-emerald-300" />
          <p className="text-[10px] uppercase tracking-widest text-white/50">Recent Session Notes</p>
        </div>
        {!courseId && courses.length > 0 && (
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 rounded border border-white/10 bg-black px-1 text-xs text-white">
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        )}
      </div>

      {sessions.length ? (
        <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
          {sessions.map((s) => {
            const c = courseById[s.course_id];
            return (
              <div key={s.id} className="rounded-md border border-white/10 p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono">{c?.code || "Free Study"}</span>
                  <span className="text-[10px] text-white/40 font-mono tabular-nums">{fmtDate(s.completed_at)} · {fmtDur(s.duration_minutes || 0)}</span>
                </div>
                <p className="text-xs text-white/70 leading-snug whitespace-pre-wrap">{s.notes}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-white/30 text-center py-6">
          {courseId ? "No notes for this course yet." : "No session notes yet."}
        </p>
      )}
    </div>
  );
}