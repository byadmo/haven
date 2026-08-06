import React from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { taskTypeMeta } from "@/lib/taskTypes";

const PRIORITY_BADGE = {
  high: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  low: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
};
function priorityBadge(p) { return PRIORITY_BADGE[p] || PRIORITY_BADGE.medium; }

export default function FocusRow({ focus, course, settings, onStart, compact }) {
  const meta = taskTypeMeta(focus.task_type, settings);
  return (
    <div className={`flex items-center justify-between gap-3 ${compact ? "py-2 border-b border-white/5 last:border-0" : "rounded-md border border-white/10 p-3"}`}>
      <div className="min-w-0 flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] uppercase tracking-widest font-mono" style={{ color: meta.color }}>{meta.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 border rounded font-mono uppercase ${priorityBadge(focus.priority)}`}>{focus.priority}</span>
          </div>
          <p className="text-sm text-zinc-100 truncate">{focus.title}</p>
          <p className="text-[11px] text-white/40 font-mono truncate">
            {course?.code || "Free"} · {focus.suggested_duration || 25}m{focus.notes ? ` · ${focus.notes}` : ""}
          </p>
        </div>
      </div>
      {onStart && (
        <Button size="sm" onClick={onStart} className="bg-emerald-500 text-black hover:bg-emerald-400 shrink-0">
          <Play className="h-3.5 w-3.5 mr-1" /> Start
        </Button>
      )}
    </div>
  );
}