import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { resolveTaskTypes } from "@/lib/taskTypes";

const STATUSES = ["not_started", "in_progress", "submitted", "graded"];
function pretty(v) { return (v || "").replace(/_/g, " "); }

// Add/Edit a scheduled task backed by the Deliverable entity — the SAME records
// the Dashboard, Analytics, Grades and Google Calendar sync read/write. The
// type dropdown pulls from the shared Task Types list used in Settings.
export default function ScheduleTaskModal({ open, onOpenChange, defaultDate, deliverable }) {
  const { courses, createDeliverable, updateDeliverable, deleteDeliverable, settings } = useEduSync();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const taskTypes = resolveTaskTypes(settings);

  const [form, setForm] = useState(empty(today));
  const [saving, setSaving] = useState(false);

  function empty(d) {
    return { title: "", type: taskTypes[0]?.name || "Studying", course_id: "", due_date: d || today, due_time: "", weight: 0, status: "not_started", grade: "" };
  }

  useEffect(() => {
    if (!open) return;
    if (deliverable) {
      setForm({
        title: deliverable.title || "",
        type: deliverable.type || taskTypes[0]?.name || "Studying",
        course_id: deliverable.course_id || "",
        due_date: deliverable.due_date || today,
        due_time: deliverable.due_time || "",
        weight: deliverable.weight ?? 0,
        status: deliverable.status || "not_started",
        grade: deliverable.grade != null ? String(deliverable.grade) : "",
      });
    } else {
      setForm(empty(defaultDate || today));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deliverable, defaultDate]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) { toast({ title: "Task name required", variant: "destructive" }); return; }
    if (!form.due_date) { toast({ title: "Date required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const isExam = /exam|midterm|final/i.test(form.type) && !/prep/i.test(form.type);
      const graded = form.status === "graded";
      const completed = ["submitted", "graded"].includes(form.status);
      const gradeVal = form.grade !== "" ? Number(form.grade) : null;
      const payload = {
        course_id: form.course_id || null,
        title: form.title.trim(),
        due_date: form.due_date,
        due_time: form.due_time || null,
        weight: Number(form.weight) || 0,
        type: form.type,
        status: form.status,
        is_exam: isExam,
        completed,
        graded,
        grade: graded ? gradeVal : null,
        max_grade: 100,
      };
      if (deliverable) {
        await updateDeliverable(deliverable.id, payload);
        toast({ title: "Task updated" });
      } else {
        await createDeliverable(payload);
        toast({ title: "Task added" });
      }
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deliverable) return;
    setSaving(true);
    try {
      await deleteDeliverable(deliverable.id);
      toast({ title: "Task deleted" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-black border-white/10">
        <DialogHeader>
          <DialogTitle className="text-sm text-zinc-50">{deliverable ? "Edit Task" : "Add Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Task name">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Read Chapter 4" className="bg-black border-white/10 h-9" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Task type">
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {taskTypes.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />
                        {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Course (optional)">
              <Select value={form.course_id || "free"} onValueChange={(v) => set("course_id", v === "free" ? "" : v)}>
                <SelectTrigger className="bg-black border-white/10"><SelectValue placeholder="Free" /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value="free">Free</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Date">
              <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} className="bg-black border-white/10 h-9" />
            </Field>
            <Field label="Time">
              <Input type="time" value={form.due_time} onChange={(e) => set("due_time", e.target.value)} className="bg-black border-white/10 h-9" />
            </Field>
            <Field label="Weight %">
              <Input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} className="bg-black border-white/10 h-9" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{pretty(s)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Grade % (if graded)">
              <Input type="number" value={form.grade} onChange={(e) => set("grade", e.target.value)} placeholder="—" disabled={form.status !== "graded"} className="bg-black border-white/10 h-9" />
            </Field>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          {deliverable ? (
            <Button variant="outline" onClick={remove} disabled={saving} className="border-rose-400/30 text-rose-300 hover:bg-rose-500/10">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/70">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-500 text-black hover:bg-emerald-400">{saving ? "Saving…" : deliverable ? "Save" : "Add Task"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{label}</p>
      {children}
    </div>
  );
}