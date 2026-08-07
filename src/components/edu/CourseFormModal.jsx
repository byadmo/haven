import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarClock, UploadCloud, Keyboard, ArrowLeft, Sparkles, Loader2, Pencil, Check, Search, X } from "lucide-react";
import SyllabusUpload from "@/components/edu/SyllabusUpload";
import CalendarImport from "@/components/edu/CalendarImport";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { autocompleteCourses } from "@/lib/courseAutofill";

const DAYS = ["M", "T", "W", "Th", "F", "S", "Su"];
const DIFF_OPTIONS = ["Easy", "Moderate", "Hard"];

export default function CourseFormModal({ open, onOpenChange, semesterId, semesterStart }) {
  const { createCourse, settings } = useEduSync();
  const { toast } = useToast();
  const [step, setStep] = React.useState("choose"); // choose | calendar | manual | upload
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm());
  const [editingHours, setEditingHours] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]);
  const [suggLoading, setSuggLoading] = React.useState(false);
  const [suggOpen, setSuggOpen] = React.useState(false);
  const reqIdRef = React.useRef(0);
  const selectedRef = React.useRef(false);

  React.useEffect(() => {
    if (open) {
      const f = emptyForm();
      // Inherit the user's university + faculty/program/specialization so the
      // saved course defaults to the right context and the catalog fields
      // pre-fill instantly from the profile (no AI call needed).
      if (settings?.university_name) f.university_name = settings.university_name;
      if (settings?.faculty) f.faculty = settings.faculty;
      if (settings?.degree_program) f.degree_program = settings.degree_program;
      if (settings?.specialization) f.specialization = settings.specialization;
      setForm(f);
      setStep("choose");
      setSaving(false);
      setSuggestions([]);
      setSuggLoading(false);
      setSuggOpen(false);
      setEditingHours(false);
      reqIdRef.current = 0;
      selectedRef.current = false;
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

  // Apply a chosen catalog course to the form. Faculty/degree/specialization
  // fall back to the profile values already in the form when the AI omits them.
  function applyCandidate(c) {
    setForm((p) => ({
      ...p,
      code: c.code || p.code,
      title: c.title || p.title,
      course_description: c.description || p.course_description,
      credits: typeof c.credits === "number" && c.credits > 0 ? c.credits : p.credits,
      faculty: c.faculty || p.faculty,
      degree_program: c.degree_program || p.degree_program,
      specialization: c.specialization || p.specialization,
      prerequisites: c.prerequisites || p.prerequisites,
      difficulty_ranking: c.difficulty_ranking || p.difficulty_ranking,
      difficulty_reason: c.difficulty_reason || p.difficulty_reason,
      target_weekly_hours: typeof c.estimated_weekly_hours === "number" ? c.estimated_weekly_hours : p.target_weekly_hours,
    }));
  }

  const uniObj = React.useMemo(() => ({
    university_name: settings?.university_name,
    university_domain: settings?.university_domain,
    university_course_catalog_url: settings?.university_course_catalog_url,
    name: settings?.university_name,
    domain: settings?.university_domain,
    catalogUrl: settings?.university_course_catalog_url,
  }), [settings]);
  const profileObj = React.useMemo(() => ({
    degree_program: settings?.degree_program,
    specialization: settings?.specialization,
    faculty: settings?.faculty,
  }), [settings]);

  // Live, debounced catalog search as the user types the course code.
  React.useEffect(() => {
    if (step !== "manual") return;
    if (selectedRef.current) { selectedRef.current = false; return; }
    const q = (form.code || "").trim();
    if (q.length < 2 || !settings?.university_name) {
      setSuggestions([]); setSuggOpen(false); setSuggLoading(false); return;
    }
    const id = ++reqIdRef.current;
    const t = setTimeout(async () => {
      setSuggLoading(true); setSuggOpen(true);
      const list = await autocompleteCourses({ query: q, university: uniObj, profile: profileObj });
      if (id !== reqIdRef.current) return;
      setSuggestions(list);
      setSuggLoading(false);
      setSuggOpen(list.length > 0);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.code, step, settings, uniObj, profileObj]);

  async function manualSearch() {
    if (!form.code) { toast({ title: "Enter a course code first", variant: "destructive" }); return; }
    if (!settings?.university_name) { toast({ title: "Add a university in Settings to unlock AI autofill" }); return; }
    const id = ++reqIdRef.current;
    setSuggLoading(true); setSuggOpen(true);
    const list = await autocompleteCourses({ query: form.code, university: uniObj, profile: profileObj });
    if (id !== reqIdRef.current) return;
    setSuggestions(list);
    setSuggLoading(false);
    setSuggOpen(list.length > 0);
    if (!list.length) toast({ title: "No matches found", description: "Enter the details manually." });
  }

  function pickSuggestion(c) {
    selectedRef.current = true;
    applyCandidate(c);
    set("code", c.code);
    setSuggOpen(false);
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
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-3xl w-full">
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
            {/* Course code + live catalog dropdown */}
            <div className="relative">
              <Label className="text-white/50">Course Code</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                  <Input
                    value={form.code}
                    onChange={(e) => set("code", e.target.value)}
                    onFocus={() => { if (suggestions.length) setSuggOpen(true); }}
                    className="bg-black border-white/10 pl-8"
                    placeholder="e.g. ECE 105"
                    required
                  />
                  {suggLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-emerald-300/70" />}
                </div>
                <Button type="button" onClick={manualSearch} disabled={suggLoading || !form.code} className="bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 shrink-0" title="AI autofill from your university's course catalog">
                  {!suggLoading && <Sparkles className="h-4 w-4 mr-1" />}
                  <span className="whitespace-nowrap">AI Autofill</span>
                </Button>
              </div>
              {settings?.university_name && (
                <p className="text-[10px] text-white/30 mt-1">Type a code to see matching courses from {settings.university_name}'s catalog.</p>
              )}

              {suggOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSuggOpen(false)} />
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-white/10 bg-black shadow-lg">
                    {suggLoading ? (
                      <div className="px-3 py-4 text-xs text-white/50 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" /> Searching the catalog…</div>
                    ) : suggestions.length ? (
                      suggestions.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => pickSuggestion(c)}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 border-b border-white/5 last:border-0 hover:bg-emerald-500/10 transition-colors"
                        >
                          <span className="text-xs font-mono text-emerald-300 w-20 shrink-0">{c.code}</span>
                          <span className="text-xs text-zinc-100 truncate flex-1 min-w-0">{c.title}</span>
                          {c.credits != null && <span className="text-[10px] text-white/40 font-mono shrink-0">{c.credits}cr</span>}
                          <span className={`h-2 w-2 rounded-full shrink-0 ${c.difficulty_ranking === "Easy" ? "bg-emerald-400" : c.difficulty_ranking === "Hard" ? "bg-rose-400" : "bg-amber-400"}`} title={c.difficulty_ranking} />
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-xs text-white/40 flex items-center justify-between gap-2">
                        <span>No matches found.</span>
                        <button type="button" onClick={() => setSuggOpen(false)} className="text-white/30 hover:text-white/60"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div><Label className="text-white/50">Title</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="bg-black border-white/10 mt-1" required />
            </div>

            {form.difficulty_ranking && (
              <div className="flex items-center gap-2 rounded-md border border-white/10 bg-emerald-500/5 px-3 py-2">
                <span className={`h-2.5 w-2.5 rounded-full ${form.difficulty_ranking === "Easy" ? "bg-emerald-400" : form.difficulty_ranking === "Moderate" ? "bg-amber-400" : "bg-rose-400"}`} />
                <span className="text-xs text-zinc-100 font-medium">{form.difficulty_ranking}</span>
                {form.difficulty_reason && <span className="text-[11px] text-white/50 break-words min-w-0">— {form.difficulty_reason}</span>}
              </div>
            )}

            <div>
              <Label className="text-white/50">Course Description</Label>
              <Textarea value={form.course_description || ""} onChange={(e) => set("course_description", e.target.value)} rows={3} className="bg-black border-white/10 mt-1 text-sm leading-relaxed whitespace-normal break-words" placeholder="Auto-filled from the catalog — edit as needed" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* AI-Estimated Weekly Hours — read-only with edit override */}
            <div className="rounded-md border border-white/10 bg-black/40 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <Label className="text-white/50 block">AI-Estimated Weekly Hours</Label>
                  <p className="text-[10px] text-white/35 mt-0.5">(based on course difficulty & credit weight)</p>
                </div>
                {editingHours ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input type="number" min="0" max="80" value={form.target_weekly_hours} onChange={(e) => set("target_weekly_hours", e.target.value)} className="bg-black border-white/10 w-20" />
                    <button type="button" onClick={() => setEditingHours(false)} className="text-emerald-300 hover:text-emerald-200 p-1" title="Done"><Check className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-mono tabular-nums text-zinc-100">{form.target_weekly_hours}h</span>
                    <button type="button" onClick={() => setEditingHours(true)} className="text-white/40 hover:text-emerald-300 p-1" title="Edit weekly hours"><Pencil className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label className="text-white/50">Professor Name</Label><Input value={form.professor_name} onChange={(e) => set("professor_name", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Professor Email</Label><Input value={form.professor_email} onChange={(e) => set("professor_email", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Office Hours</Label><Input value={form.office_hours} onChange={(e) => set("office_hours", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Schedule Time</Label><Input value={form.schedule_time} onChange={(e) => set("schedule_time", e.target.value)} placeholder="10:00-11:30" className="bg-black border-white/10 mt-1" /></div>
              <div><Label className="text-white/50">Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} className="bg-black border-white/10 mt-1" /></div>
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