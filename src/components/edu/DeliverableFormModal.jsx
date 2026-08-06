import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

const TYPES = ["assignment", "quiz", "midterm", "exam", "project", "lab", "other"];
const STATUSES = ["not_started", "in_progress", "submitted", "graded"];

function pretty(v) { return v.replace(/_/g, " "); }

export default function DeliverableFormModal({ open, onOpenChange, course }) {
  const { createDeliverable } = useEduSync();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", due_date: "", weight: 0, type: "assignment", status: "not_started", grade: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ title: "", due_date: "", weight: 0, type: "assignment", status: "not_started", grade: "" });
  }, [open]);

  async function save() {
    if (!form.title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    if (!form.due_date) { toast({ title: "Due date required", description: "Pick a due date so it shows on your Dashboard & Grades.", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const isExam = ["exam", "midterm", "final"].includes(form.type);
      const graded = form.status === "graded";
      const completed = ["submitted", "graded"].includes(form.status);
      const gradeVal = form.grade !== "" ? Number(form.grade) : null;
      await createDeliverable({
        course_id: course?.id || null,
        title: form.title.trim(),
        due_date: form.due_date || null,
        weight: Number(form.weight) || 0,
        type: form.type,
        status: form.status,
        is_exam: isExam,
        completed,
        graded,
        grade: graded ? gradeVal : null,
        max_grade: 100,
      });
      toast({ title: "Deliverable added" });
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
          <DialogTitle className="text-sm text-zinc-50">Add Deliverable · {course?.code || ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Assignment 2" className="bg-black border-white/10 h-9" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date">
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="bg-black border-white/10 h-9" />
            </Field>
            <Field label="Weight %">
              <Input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="bg-black border-white/10 h-9" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {STATUSES.map((t) => <SelectItem key={t} value={t}>{pretty(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Grade received (optional)">
            <Input type="number" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="—" disabled={form.status !== "graded"} className="bg-black border-white/10 h-9" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/70">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-500 text-black hover:bg-emerald-400">{saving ? "Saving…" : "Add Deliverable"}</Button>
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