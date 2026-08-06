import React, { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

function dayKey(d) { return d.toISOString().slice(0, 10); }
function fmtM(min) {
  const m = Math.max(0, Math.floor(min || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

export default function TodaySessions() {
  const { studySessions, courses, deliverables, deleteStudySession, updateStudySession, clearStudySessions } = useEduSync();
  const { toast } = useToast();
  const [range, setRange] = useState("today");
  const [edit, setEdit] = useState(null);

  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]));
  const delivById = Object.fromEntries(deliverables.map((d) => [d.id, d]));
  const now = new Date();
  const todayKey = dayKey(now);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);

  const list = studySessions.filter((s) => {
    const d = s.completed_at ? new Date(s.completed_at) : null;
    if (!d) return false;
    if (range === "today") return dayKey(d) === todayKey;
    return d >= weekAgo;
  }).sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));

  async function handleDelete(id) { await deleteStudySession(id); toast({ title: "Session deleted" }); }
  async function handleClearAll() {
    if (!list.length) return;
    await clearStudySessions(list.map((s) => s.id));
    toast({ title: "Cleared " + list.length + " sessions" });
  }
  async function handleSaveEdit() {
    if (!edit) return;
    await updateStudySession(edit.id, {
      duration_minutes: Number(edit.duration_minutes) || 1,
      course_id: edit.course_id === "__free__" ? null : edit.course_id,
      deliverable_id: edit.deliverable_id === "__free__" ? null : edit.deliverable_id,
    });
    setEdit(null);
    toast({ title: "Session updated" });
  }

  const editDeliverables = edit && edit.course_id !== "__free__" ? deliverables.filter((x) => x.course_id === edit.course_id) : [];

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-[10px] uppercase tracking-widest text-white/50">{range === "today" ? "Today's Sessions" : "This Week's Sessions"}</p>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-white/10 overflow-hidden">
            <button onClick={() => setRange("today")} className={"px-2.5 h-7 text-[11px] " + (range === "today" ? "bg-emerald-500/15 text-emerald-300" : "text-white/50 hover:text-white/70")}>Today</button>
            <button onClick={() => setRange("week")} className={"px-2.5 h-7 text-[11px] border-l border-white/10 " + (range === "week" ? "bg-emerald-500/15 text-emerald-300" : "text-white/50 hover:text-white/70")}>Week</button>
          </div>
          {list.length > 0 ? (
            <Button size="sm" variant="ghost" onClick={handleClearAll} className="h-7 text-[11px] text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 px-2">Clear All</Button>
          ) : null}
        </div>
      </div>

      {list.length ? (
        <div className="space-y-1.5">
          {list.map((s) => {
            const c = s.course_id ? courseById[s.course_id] : null;
            const d = s.deliverable_id ? delivById[s.deliverable_id] : null;
            const time = s.completed_at ? new Date(s.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            return (
              <div key={s.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                <span className="text-[11px] font-mono text-white/40 w-12 shrink-0">{time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-100 truncate">{c ? c.code : "Free Study"}{d ? " · " + d.title : ""}</p>
                  <p className="text-[10px] text-white/40">{fmtM(s.duration_minutes)} · {s.mode}</p>
                </div>
                <button onClick={() => setEdit({ id: s.id, duration_minutes: s.duration_minutes, course_id: s.course_id || "__free__", deliverable_id: s.deliverable_id || "__free__" })} className="text-white/40 hover:text-emerald-300 p-1" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleDelete(s.id)} className="text-white/30 hover:text-rose-300 p-1" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/30 text-center py-6">No sessions {range === "today" ? "today" : "this week"} yet.</p>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-md bg-black border-white/10">
          <DialogHeader><DialogTitle className="text-sm text-zinc-50">Edit Session</DialogTitle></DialogHeader>
          {edit ? (
            <div className="space-y-3 py-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Duration (minutes)</p>
                <Input type="number" value={edit.duration_minutes} onChange={(e) => setEdit({ ...edit, duration_minutes: e.target.value })} className="bg-black border-white/10 h-9" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Course</p>
                <Select value={edit.course_id} onValueChange={(v) => setEdit({ ...edit, course_id: v, deliverable_id: "__free__" })}>
                  <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="__free__">Free Study</SelectItem>
                    {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Deliverable</p>
                <Select value={edit.deliverable_id} onValueChange={(v) => setEdit({ ...edit, deliverable_id: v })} disabled={edit.course_id === "__free__"}>
                  <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="__free__">No specific task</SelectItem>
                    {editDeliverables.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)} className="border-white/10 text-white/70">Cancel</Button>
            <Button onClick={handleSaveEdit} className="bg-emerald-500 text-black hover:bg-emerald-400">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}