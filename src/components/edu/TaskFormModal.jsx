import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { resolveTaskTypes } from "@/lib/taskTypes";

const PRIORITIES = ["low", "medium", "high"];

export default function TaskFormModal({ open, onOpenChange, defaultDate }) {
  const { createFocus, courses, settings } = useEduSync();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState(empty(today));
  const [saving, setSaving] = useState(false);

  const taskTypes = resolveTaskTypes(settings);

  function empty(d) {
    return { title: "", task_type: "Studying", course_id: "", target_date: d || today, suggested_duration: 25, priority: "medium", notes: "" };
  }

  useEffect(() => {
    if (open) setForm(empty(defaultDate || today));
     
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (!form.target_date) { toast({ title: "Date required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await createFocus({
        course_id: form.course_id || null,
        title: form.title.trim(),
        target_date: form.target_date,
        suggested_duration: Number(form.suggested_duration) || 25,
        priority: form.priority,
        task_type: form.task_type,
        notes: form.notes || "",
        status: "planned",
      });
      toast({ title: "Task added" });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-black border-white/10">
        <DialogHeader>
          <DialogTitle className="text-sm text-zinc-50">Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Task title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Read Ch. 4" className="bg-black border-white/10 h-9" autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Task type">
              <Select value={form.task_type} onValueChange={(v) => set("task_type", v)}>
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
              <Select value={form.course_id} onValueChange={(v) => set("course_id", v)}>
                <SelectTrigger className="bg-black border-white/10"><SelectValue placeholder="Free" /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value={null}>Free</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Due date">
              <Input type="date" value={form.target_date} onChange={(e) => set("target_date", e.target.value)} className="bg-black border-white/10 h-9" />
            </Field>
            <Field label="Duration (m)">
              <Input type="number" value={form.suggested_duration} onChange={(e) => set("suggested_duration", e.target.value)} className="bg-black border-white/10 h-9" />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Notes (optional)">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. focus on derivations" className="bg-black border-white/10 text-sm min-h-[60px]" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/70">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-500 text-black hover:bg-emerald-400">{saving ? "Saving…" : "Add Task"}</Button>
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