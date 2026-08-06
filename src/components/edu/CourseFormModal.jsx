import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud, Keyboard, ArrowLeft } from "lucide-react";
import SyllabusUpload from "@/components/edu/SyllabusUpload";
import { useEduSync } from "@/lib/eduSyncContext";

const DAYS = ["M", "T", "W", "Th", "F", "S", "Su"];

export default function CourseFormModal({ open, onOpenChange, semesterId }) {
  const { createCourse } = useEduSync();
  const [step, setStep] = React.useState("choose"); // choose | manual | upload
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm());

  React.useEffect(() => { if (open) { setStep("choose"); setForm(emptyForm()); } }, [open]);

  function emptyForm() {
    return { code: "", title: "", professor_name: "", professor_email: "", office_hours: "", schedule_days: [], schedule_time: "", location: "", target_weekly_hours: 6, credits: 3 };
  }
  function toggleDay(d) {
    setForm((p) => ({ ...p, schedule_days: p.schedule_days.includes(d) ? p.schedule_days.filter((x) => x !== d) : [...p.schedule_days, d] }));
  }
  async function saveManual(e) {
    e.preventDefault();
    if (!form.code || !form.title) return;
    setSaving(true);
    try {
      await createCourse({ course: { ...form, semester_id: semesterId }, deliverables: [], materials: [] });
      onOpenChange(false);
    } finally { setSaving(false); }
  }
  async function saveParsed(data) {
    setSaving(true);
    try {
      await createCourse({
        course: { code: data.code, title: data.title, professor_name: data.professor_name, professor_email: data.professor_email, office_hours: data.office_hours, schedule_days: data.schedule_days, schedule_time: data.schedule_time, location: data.location, target_weekly_hours: data.target_weekly_hours, credits: data.credits, semester_id: semesterId },
        deliverables: data.deliverables.filter((d) => d.title),
        materials: data.materials.filter((m) => m.title),
      });
      onOpenChange(false);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {step === "choose" && "Add Course"}
            {step === "manual" && "Enter Manually"}
            {step === "upload" && "Upload Syllabus"}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {step === "choose" && "Add a course by uploading a syllabus or entering details manually."}
            {step === "manual" && "Fill in the course details."}
            {step === "upload" && "Drop a syllabus and we'll extract the details."}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid grid-cols-2 gap-3 py-2">
            <button onClick={() => setStep("upload")} className="rounded-lg border border-white/10 p-5 text-left hover:border-emerald-400/30 transition-colors">
              <UploadCloud className="h-6 w-6 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-zinc-100">Upload Syllabus</p>
              <p className="text-[11px] text-white/40 mt-1">AI extracts course, deliverables & materials.</p>
            </button>
            <button onClick={() => setStep("manual")} className="rounded-lg border border-white/10 p-5 text-left hover:border-emerald-400/30 transition-colors">
              <Keyboard className="h-6 w-6 text-emerald-400 mb-2" />
              <p className="text-sm font-medium text-zinc-100">Enter Manually</p>
              <p className="text-[11px] text-white/40 mt-1">Type in the course details yourself.</p>
            </button>
          </div>
        )}

        {step === "manual" && (
          <form onSubmit={saveManual} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/50">Course Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="bg-black border-white/10" required /></div>
              <div><Label className="text-white/50">Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-black border-white/10" required /></div>
              <div><Label className="text-white/50">Professor Name</Label><Input value={form.professor_name} onChange={(e) => setForm({ ...form, professor_name: e.target.value })} className="bg-black border-white/10" /></div>
              <div><Label className="text-white/50">Professor Email</Label><Input value={form.professor_email} onChange={(e) => setForm({ ...form, professor_email: e.target.value })} className="bg-black border-white/10" /></div>
              <div><Label className="text-white/50">Office Hours</Label><Input value={form.office_hours} onChange={(e) => setForm({ ...form, office_hours: e.target.value })} className="bg-black border-white/10" /></div>
              <div><Label className="text-white/50">Schedule Time</Label><Input value={form.schedule_time} placeholder="10:00-11:30" onChange={(e) => setForm({ ...form, schedule_time: e.target.value })} className="bg-black border-white/10" /></div>
              <div><Label className="text-white/50">Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-black border-white/10" /></div>
              <div><Label className="text-white/50">Credits</Label><Input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} className="bg-black border-white/10" /></div>
            </div>
            <div>
              <Label className="text-white/50">Schedule days</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DAYS.map((d) => (
                  <button key={d} type="button" onClick={() => toggleDay(d)} className={`h-8 w-10 rounded-md border text-xs ${form.schedule_days.includes(d) ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50"}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/50">Target Weekly Hours</Label><Input type="number" value={form.target_weekly_hours} onChange={(e) => setForm({ ...form, target_weekly_hours: Number(e.target.value) })} className="bg-black border-white/10" /></div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setStep("choose")} className="text-white/50"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <DialogClose asChild><Button type="button" variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Cancel</Button></DialogClose>
              <Button type="submit" disabled={saving} className="bg-emerald-500 text-black hover:bg-emerald-400">{saving ? "Saving…" : "Save Course"}</Button>
            </DialogFooter>
          </form>
        )}

        {step === "upload" && (
          <div className="space-y-3">
            {saving ? (
              <div className="flex items-center justify-center py-10 text-white/60 text-sm">Saving course…</div>
            ) : (
              <SyllabusUpload onConfirmed={saveParsed} />
            )}
            {!saving && <Button type="button" variant="ghost" onClick={() => setStep("choose")} className="text-white/50"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}