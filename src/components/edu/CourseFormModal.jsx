import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, UploadCloud, Keyboard, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import SyllabusUpload from "@/components/edu/SyllabusUpload";
import CalendarImport from "@/components/edu/CalendarImport";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { autofillCourse } from "@/lib/courseAutofill";

const DAYS = ["M", "T", "W", "Th", "F", "S", "Su"];
const DIFF_OPTIONS = ["Easy", "Moderate", "Hard"];

export default function CourseFormModal({ open, onOpenChange, semesterId, semesterStart }) {
  const { createCourse, settings } = useEduSync();
  const { toast } = useToast();
  const [step, setStep] = React.useState("choose"); // choose | calendar | manual | upload
  const [saving, setSaving] = React.useState(false);
  const [autofilling, setAutofilling] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm());

  React.useEffect(() => {
    if (open) {
      const f = emptyForm();
      // Inherit the user's university so autofill + saved course default to it.
      if (settings?.university_name) f.university_name = settings.university_name;
      setForm(f);
      setStep("choose");
      setSaving(false);
      setAutofilling(false);
    }
  }, [open, settings]);

  function emptyForm() {
    return {
      code: "", title: "", professor_name: "", professor_email: "", office_hours: "",
      schedule_days: [], schedule_time: "", location: "", target_weekly_hours: 6, credits: 3,
      course_description: "", faculty: "", degree_program: "", specialization: "", prerequisites: "",
      difficulty_ranking: "", difficulty_reason: "", university_name: "",
    };
  }
  function toggleDay(d) {
    setForm((p) => ({ ...p, schedule_days: p.schedule_days.includes(d) ? p.schedule_days.filter((x) => x !== d) : [...p.schedule_days, d] }));
  }
  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function runAutofill() {
    if (!form.code) {
      toast({ title: "Enter a course code first", variant: "destructive" });
      return;
    }
    setAutofilling(true);
    try {
      const uni = {
        university_name: form.university_name || settings?.university_name,
        university_domain: settings?.university_domain,
        university_course_catalog_url: settings?.university_course_catalog_url,
        name: settings?.university_name,
        domain: settings?.university_domain,
        catalogUrl: settings?.university_course_catalog_url,
      };
      const out = await autofillCourse({ code: form.code, university: uni });
      setForm((p) => ({
        ...p,
        title: out.title || p.title,
        course_description: out.description || p.course_description,
        credits: typeof out.credits === "number" && out.credits > 0 ? out.credits : p.credits,
        faculty: out.faculty || p.faculty,
        degree_program: out.degree_program || p.degree_program,
        specialization: out.specialization || p.specialization,
        prerequisites: out.prerequisites || p.prerequisites,
        difficulty_ranking: out.difficulty_ranking || p.difficulty_ranking,
        difficulty_reason: out.difficulty_reason || p.difficulty_reason,
        university_name: p.university_name || settings?.university_name,
      }));
      if (!out.description) toast({ title: "Couldn't find that course — fields left editable", description: "Best-guess department filled from the code prefix." });
    } catch (e) {
      toast({ title: "Autofill failed", variant: "destructive" });
    } finally {
      setAutofilling(false);
    }
  }

  async function saveManual(e) {
    e.preventDefault();
    if (!form.code || !form.title) return;
    setSaving(true);
    try {
      await createCourse({
        course: {
          ...form,
          credits: Number(form.credits) || 3,
          target_weekly_hours: Number(form.target_weekly_hours) || 6,
          semester_id: semesterId,
          university_name: form.university_name || settings?.university_name || null,
        },
        deliverables: [],
        materials: [],
      });
      onOpenChange(false);
    } finally { setSaving(false); }
  }
  async function saveParsed(data) {
    setSaving(true);
    try {
      await createCourse({
        course: {
          code: data.code, title: data.title, professor_name: data.professor_name, professor_email: data.professor_email,
          office_hours: data.office_hours, schedule_days: data.schedule_days, schedule_time: data.schedule_time,
          location: data.location, target_weekly_hours: data.target_weekly_hours, credits: data.credits,
          semester_id: semesterId, university_name: settings?.university_name || null,
        },
        deliverables: data.deliverables.filter((d) => d.title),
        materials: data.materials.filter((m) => m.title),
      });
      onOpenChange(false);
    } finally { setSaving(false); }
  }

  const options = [
    { id: "calendar", icon: CalendarClock, title: "Import from Calendar", desc: "AI detects recurring classes from your Google Calendar.", primary: true },
    { id: "upload", icon: UploadCloud, title: "Upload Syllabus", desc: "AI extracts course, deliverables & materials." },
    { id: "manual", icon: Keyboard, title: "Enter Manually", desc: "Type a course code and let AI autofill from your university's catalog." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {step === "choose" && "Add Course"}
            {step === "calendar" && "Import from Calendar"}
            {step === "manual" && "Enter Manually"}
            {step === "upload" && "Upload Syllabus"}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {step === "choose" && "Import courses from your calendar, enrich with a syllabus, or enter details manually."}
            {step === "calendar" && "We scan one week of your calendar and detect recurring classes."}
            {step === "manual" && (settings?.university_name ? `AI autofills from ${settings.university_name}'s catalog.` : "Add a university in Settings to unlock AI autofill.")}
            {step === "upload" && "Drop a syllabus and we'll extract the details."}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid grid-cols-1 gap-3 py-2">
            {options.map((o) => (
              <button key={o.id} onClick={() => setStep(o.id)} className={`flex items-start gap-3 rounded-lg border p-4 text-left hover:border-emerald-400/30 transition-colors ${o.primary ? "border-emerald-400/30 bg-emerald-500/5" : "border-white/10"}`}>
                <o.icon className={`h-6 w-6 shrink-0 ${o.primary ? "text-emerald-400" : "text-emerald-400/80"}`} />
                <div>
                  <p className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                    {o.title}
                    {o.primary && <span className="text-[9px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 rounded px-1 py-0.5">Primary</span>}
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5">{o.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "calendar" && (
          <div className="space-y-3">
            <CalendarImport semesterId={semesterId} semesterStart={semesterStart} onDone={() => onOpenChange(false)} />
            <Button type="button" variant="ghost" onClick={() => setStep("choose")} className="text-white/50"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          </div>
        )}

        {step === "manual" && (
          <form onSubmit={saveManual} className="space-y-3">
            {/* Course code + AI autofill */}
            <div>
              <Label className="text-white/50">Course Code</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.code} onChange={(e) => set("code", e.target.value)} className="bg-black border-white/10" placeholder="e.g. ECE 105" required />
                <Button type="button" onClick={runAutofill} disabled={autofilling || !form.code} className="bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 shrink-0" title="AI autofill from your university's course catalog">
                  {autofilling ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  <span className="whitespace-nowrap">AI Autofill</span>
                </Button>
              </div>
            </div>

            <div><Label className="text-white/50">Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="bg-black border-white/10 mt-1" required />
            </div>

            {form.difficulty_ranking && (
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-emerald-500/5 px-3 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${form.difficulty_ranking === "Easy" ? "bg-emerald-400" : form.difficulty_ranking === "Moderate" ? "bg-amber-400" : "bg-rose-400"}`} />
                <span className="text-xs text-zinc-100 font-medium">{form.difficulty_ranking}</span>
                {form.difficulty_reason && <span className="text-[11px] text-white/50 truncate">— {form.difficulty_reason}</span>}
              </div>
            )}

            <div>
              <Label className="text-white/50">Course Description</Label>
              <Textarea value={form.course_description || ""} onChange={(e) => set("course_description", e.target.value)} rows={2} className="bg-black border-white/10 mt-1 text-sm" placeholder="Auto-filled from the catalog — edit as needed" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/50">Faculty</Label><Input value={form.faculty || ""} onChange={(e) => set("faculty", e.target.value)} className="bg-black border-white/10 mt-1" placeholder="e.g. Faculty of Engineering" /></div>
              <div><Label className="text-white/50">Degree Program</Label><Input value={form.degree_program || ""} onChange={(e) => set("degree_program", e.target.value)} className="bg-black border-white/10 mt-1" placeholder="e.g. Electrical Engineering" /></div>
              <div><Label className="text-white/50">Specialization</Label><Input value={form.specialization || ""} onChange={(e) => set("specialization", e.target.value)} className="bg-black border-white/10 mt-1" placeholder="e.g. Power Systems" /></div>
              <div><Label className="text-white/50">Prerequisites</Label><Input value={form.prerequisites || ""} onChange={(e) => set("prerequisites", e.target.value)} className="bg-black border-white/10 mt-1" placeholder="e.g. MATH 137" /></div>
              <div><Label className="text-white/50">Difficulty</Label>
                <Select value={form.difficulty_ranking || "__none__"} onValueChange={(v) => set("difficulty_ranking", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="bg-black border-white/10 mt-1"><span className={!form.difficulty_ranking ? "text-white/30" : ""}>{form.difficulty_ranking || "Not set"}</span></SelectTrigger>
                  <SelectContent>
                    {DIFF_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    <SelectItem value="__none__">Not set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/50">Credits</Label><Input type="number" value={form.credits} onChange={(e) => set("credits", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-white/50">Professor Name</Label><Input value={form.professor_name} onChange={(e) => set("professor_name", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Professor Email</Label><Input value={form.professor_email} onChange={(e) => set("professor_email", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Office Hours</Label><Input value={form.office_hours} onChange={(e) => set("office_hours", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Schedule Time</Label><Input value={form.schedule_time} onChange={(e) => set("schedule_time", e.target.value)} placeholder="10:00-11:30" className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Target Weekly Hours</Label><Input type="number" value={form.target_weekly_hours} onChange={(e) => set("target_weekly_hours", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
            </div>

            <div>
              <Label className="text-white/50">Schedule days</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DAYS.map((d) => (
                  <button key={d} type="button" onClick={() => toggleDay(d)} className={`h-8 w-10 rounded-md border text-xs ${form.schedule_days.includes(d) ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50"}`}>{d}</button>
                ))}
              </div>
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