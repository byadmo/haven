import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

export default function FocusFormModal({ open, onOpenChange, course }) {
  const { createFocus } = useEduSync();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [duration, setDuration] = useState(25);
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setTargetDate(new Date().toISOString().slice(0, 10));
      setDuration(25);
      setPriority("medium");
    }
  }, [open]);

  async function save() {
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await createFocus({
        course_id: course?.id || null,
        title: title.trim(),
        target_date: targetDate || null,
        suggested_duration: Number(duration) || 25,
        priority,
        status: "planned",
      });
      toast({ title: "Focus added" });
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
          <DialogTitle className="text-sm text-zinc-50">Add Focus · {course?.code || "Free"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Field label="Focus title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review Chapter 4" className="bg-black border-white/10 h-9" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target date">
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="bg-black border-white/10 h-9" />
            </Field>
            <Field label="Duration (min)">
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-black border-white/10 h-9" />
            </Field>
          </div>
          <Field label="Priority">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-black border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-black border-white/10">
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/70">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-500 text-black hover:bg-emerald-400">{saving ? "Saving…" : "Add Focus"}</Button>
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