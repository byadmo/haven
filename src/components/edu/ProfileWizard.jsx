import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, ChevronLeft, ChevronRight, Check, Mail, Building2, Calendar, Target, Clock, Briefcase, ListChecks, ImageUp, FileText, Loader2, X, Sparkles } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import FileDropzone from "@/components/edu/FileDropzone";
import { base44 } from "@/api/base44Client";
import { getProfile, saveProfile } from "@/lib/eduProfile";
import { useToast } from "@/components/ui/use-toast";
import UniversitySelector from "@/components/edu/UniversitySelector";

const SUGGESTIONS = [
  { label: "Light", range: "5–10h", short: "Light loads or working full-time", min: 5, max: 10 },
  { label: "Moderate", range: "10–15h", short: "Recommended for most students", min: 10, max: 15 },
  { label: "Balanced", range: "15–20h", short: "Heavier loads or aiming high", min: 15, max: 20 },
  { label: "Intensive", range: "20–30h", short: "Exam prep or demanding semesters", min: 20, max: 30 },
  { label: "Maximum", range: "30–40h", short: "Extreme cases — not sustainable", min: 30, max: 40 },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STEP_ICONS = [Mail, Building2, Calendar, Target, Clock, Briefcase, ListChecks];

// When the AI parses a schedule image it often returns the same course code
// once per section (e.g. "PCS 224" LEC + TUT + LAB as separate rows). Merge
// those into a single course: union the days, join the distinct times and
// locations so one course carries all its weekly meeting slots.
function mergeDuplicateCourses(items) {
  const groups = new Map();
  let anon = 0;
  for (const c of items) {
    const key = (c.code || "").toUpperCase().replace(/\s+/g, " ").trim();
    if (!key) { groups.set(`__anon_${anon++}`, c); continue; }
    if (!groups.has(key)) groups.set(key, { ...c, schedule_days: [], _times: [], _locs: [] });
    const g = groups.get(key);
    if (!g.title && c.title) g.title = c.title;
    (c.schedule_days || []).forEach((d) => { if (!g.schedule_days.includes(d)) g.schedule_days.push(d); });
    if (c.schedule_time && !g._times.includes(c.schedule_time)) g._times.push(c.schedule_time);
    if (c.location && !g._locs.includes(c.location)) g._locs.push(c.location);
  }
  return [...groups.values()].map((g) => ({
    code: g.code,
    title: g.title,
    schedule_days: g.schedule_days,
    schedule_time: g._times.join(", "),
    location: g._locs.join(", "),
    credits: g.credits || 3,
    color: g.color || "emerald",
  }));
}

export default function ProfileWizard({ open, onOpenChange, onCompleted }) {
  const navigate = useNavigate();
  const { courses, settings, activeSemester, createCourse, updateSettings } = useEduSync();
  const connected = !!settings?.google_synced;
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    edu_email: "", gpa_current: "", gpa_target: "", academic_goals: "",
    weekly_study_hours: 15, has_job: false, work_hours: 0, work_days: [], import_choice: "",
    screenshot_courses: [], transcript_courses: [],
    university_name: "", university_domain: "", university_course_catalog_url: "",
    faculty: "", degree_program: "", specialization: "",
    ...(getProfile() || {}),
  }));
  const [parsing, setParsing] = useState(null); // 'schedule' | 'transcript' | null
  const [parseNote, setParseNote] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const next = () => setStep((s) => Math.min(7, s + 1));

  // Seed university fields from saved EduSettings if the user already set them.
  React.useEffect(() => {
    if (!settings) return;
    if (settings.university_name && !form.university_name) set("university_name", settings.university_name);
    if (settings.university_domain && !form.university_domain) set("university_domain", settings.university_domain);
    if (settings.university_course_catalog_url && !form.university_course_catalog_url) set("university_course_catalog_url", settings.university_course_catalog_url);
    if (settings.faculty && !form.faculty) set("faculty", settings.faculty);
    if (settings.degree_program && !form.degree_program) set("degree_program", settings.degree_program);
    if (settings.specialization && !form.specialization) set("specialization", settings.specialization);
     
  }, [settings]);

  // The "AI find calendar + save URL + auto-parse" pipeline runs once at the
  // END of the wizard (see finish below) — we no longer pre-fire mid-wizard, so
  // the chosen calendar URL is persisted to EduSettings and the parse-only
  // flow run together at setup completion, with a single dismissable status
  // toast (✓ ready / ✗ failed).

  const back = () => setStep((s) => Math.max(1, s - 1));
  const toggleDay = (d) => setForm((f) => ({
    ...f, work_days: f.work_days.includes(d) ? f.work_days.filter((x) => x !== d) : [...f.work_days, d],
  }));

  async function parseSchedule(file) {
    if (!file) return;
    setParsing("schedule"); setParseNote("");
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const file_url = up?.data?.file_url || up?.file_url;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: "Extract courses from this class schedule image. For each course return: code (e.g. CSC110), title, days (array of day abbreviations from M,T,W,Th,F,S,Su), time (e.g. 10:00-11:30), and location. Only include real courses visible in the image.",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: { courses: { type: "array", items: { type: "object", properties: { code: { type: "string" }, title: { type: "string" }, days: { type: "array", items: { type: "string" } }, time: { type: "string" }, location: { type: "string" } } } } },
          required: ["courses"],
        },
      });
      const d = res?.data ?? res;
      const raw = (d?.courses || []).map((c) => ({ code: c.code || "", title: c.title || "", schedule_days: c.days || [], schedule_time: c.time || "", location: c.location || "", credits: 3, color: "emerald" }));
      const list = mergeDuplicateCourses(raw);
      set("screenshot_courses", list);
      set("import_choice", "screenshot");
      if (!list.length) setParseNote("We couldn't detect any courses — try a clearer image or add them manually.");
    } catch (e) {
      setParseNote("Could not parse image: " + (e?.message || "unknown error"));
    } finally { setParsing(null); }
  }

  async function parseTranscript(file) {
    if (!file) return;
    setParsing("transcript"); setParseNote("");
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const file_url = up?.data?.file_url || up?.file_url;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: "Parse this academic transcript. Return the overall cumulative GPA (0.0-4.0) and a list of courses taken, each with name, grade (letter), and credit hours (number).",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            gpa: { type: "number" },
            courses: { type: "array", items: { type: "object", properties: { name: { type: "string" }, grade: { type: "string" }, credits: { type: "number" } } } },
          },
          required: ["gpa", "courses"],
        },
      });
      const d = res?.data ?? res;
      const gpa = Number(d?.gpa) || 0;
      const tCourses = (d?.courses || []).map((c) => ({ name: c.name || "", grade: c.grade || "", credits: Number(c.credits) || 0 }));
      set("gpa_current", gpa ? String(gpa.toFixed(2)) : "");
      set("transcript_courses", tCourses);
      setParseNote(tCourses.length ? `We detected your GPA as ${gpa.toFixed(2)} — confirm or correct below.` : "We couldn't read the transcript — enter your GPA manually.");
    } catch (e) {
      setParseNote("Could not parse transcript: " + (e?.message || "unknown error"));
    } finally { setParsing(null); }
  }

  async function finish() {
    const payload = {
      edu_email: form.edu_email || "",
      gpa_current: Number(form.gpa_current) || 0,
      gpa_target: Number(form.gpa_target) || 0,
      academic_goals: form.academic_goals || "",
      weekly_study_hours: Number(form.weekly_study_hours) || 0,
      has_job: !!form.has_job,
      work_hours: Number(form.work_hours) || 0,
      work_days: form.work_days || [],
      screenshot_courses: form.screenshot_courses || [],
      transcript_courses: form.transcript_courses || [],
      university_name: form.university_name || "",
      university_domain: form.university_domain || "",
      university_course_catalog_url: form.university_course_catalog_url || "",
      faculty: form.faculty || "",
      degree_program: form.degree_program || "",
      specialization: form.specialization || "",
    };
    saveProfile(payload);

    // Persist ALL wizard fields to EduSettings in ONE updateSettings call. The
    // previous two-call flow raced: the second (transcript-only) create fired
    // before the first call's refresh applied the new settings id, so it
    // created a second EduSettings record that shadowed the first — leaving
    // the Settings page reading the transcript-only record with empty
    // university/faculty/program fields and the auto-parser with nothing.
    // Imported screenshot courses still go to the active semester separately.
    try {
      if (updateSettings) {
        const settingsPatch = {
          university_name: form.university_name || settings?.university_name || "",
          university_domain: form.university_domain || settings?.university_domain || "",
          university_course_catalog_url: form.university_course_catalog_url || settings?.university_course_catalog_url || "",
          faculty: form.faculty || settings?.faculty || "",
          degree_program: form.degree_program || settings?.degree_program || "",
          specialization: form.specialization || settings?.specialization || "",
        };
        if (form.transcript_courses?.length) {
          settingsPatch.transcript = { gpa: payload.gpa_current, courses: form.transcript_courses };
        }
        await updateSettings(settingsPatch);
      }
      if (form.screenshot_courses?.length && activeSemester?.id && createCourse) {
        for (const c of form.screenshot_courses) {
          await createCourse({ semester_id: activeSemester.id, code: c.code || "NEW", title: c.title || "Course", schedule_days: c.schedule_days || [], schedule_time: c.schedule_time || "", location: c.location || "", credits: c.credits || 3, color: c.color || "emerald" });
        }
      }
    } catch {}

    // End-of-wizard pipeline: AI find calendar → save URL to EduSettings →
    // parse the confirmed URL. The prep toast stays until dismissed (the X now
    // closes it) and is updated with a success checkmark or failure icon when
    // the parse resolves. Fired off in the background so the wizard can close
    // immediately and the result surfaces in Haven Education afterward.
    if (form.university_name && form.faculty && form.degree_program) {
      runAutoCatalogToast({
        university_name: form.university_name,
        university_domain: form.university_domain,
        faculty: form.faculty,
        degree_program: form.degree_program,
        specialization: form.specialization,
      });
    }
    onCompleted?.();
    onOpenChange(false);
    if (form.import_choice === "manual") navigate("/education/courses");
  }

  // Background "AI find calendar → save URL → parse" pipeline whose status
  // surfaces in the prep toast (✓ success / ✗ failed). The toast is dismissable
  // via its X at any stage — the underlying async work keeps running.
  // Dismiss the in-progress "Preparing…" toast and fire a FRESH, fully-visible
  // result toast when the pipeline finishes. The previous flow updated the
  // same toast record — but if the user had already dismissed it with X, the
  // update would land on a closed (open=false) toast and the success message
  // would never resurface. Dismissing + a brand-new toast guarantees they see
  // the completed-parse status regardless of what they did during the wait.
  async function runAutoCatalogToast(opts) {
    const t = toast({
      title: "Preparing your course catalog…",
      description: "Finding your university calendar and parsing courses in the background.",
      duration: 0,
    });
    try {
      const fRes = await base44.functions.invoke("findCourseCalendar", opts);
      const fD = fRes?.data ?? fRes;
      const best = fD?.best_url || (Array.isArray(fD?.candidates) && fD.candidates[0]?.url) || "";
      if (!best) throw new Error("Couldn't find your university calendar URL.");
      if (updateSettings) await updateSettings({ university_course_catalog_url: best });
      const pRes = await base44.functions.invoke("refreshCourseCatalog", {
        ...opts,
        university_course_catalog_url: best,
        parse_only: true,
      });
      const pD = pRes?.data ?? pRes;
      if (pD?.error) throw new Error(pD.error);
      try { t.dismiss(); } catch {}
      toast({
        title: "Course catalog ready",
        description: `${pD.course_count || 0} courses cached${pD.parse_status === "partial" ? " · partial" : ""}.`,
      });
    } catch (e) {
      try { t.dismiss(); } catch {}
      toast({
        title: "Couldn't parse catalog",
        description: e?.message || "We'll try again later.",
        variant: "destructive",
      });
    }
  }

  const remaining = useMemo(() => {
    const work = form.has_job ? Number(form.work_hours) || 0 : 0;
    return Math.max(0, 168 - work - (Number(form.weekly_study_hours) || 0));
  }, [form.has_job, form.work_hours, form.weekly_study_hours]);

  const studyLevel = SUGGESTIONS.find((s) => form.weekly_study_hours >= s.min && form.weekly_study_hours <= s.max);
  const Icon = STEP_ICONS[step - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-black border-white/10 p-0 overflow-hidden flex flex-col h-[85vh] max-h-[660px]">
        {/* Fixed header — same height on every step */}
        <div className="p-5 sm:p-6 pb-3 shrink-0">
          <DialogTitle className="text-base font-semibold text-zinc-50 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald-400" /> Complete Your Profile
          </DialogTitle>
          <div className="flex items-center gap-1.5 mb-3 mt-3">
            {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
              <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-emerald-500" : "bg-white/10"}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-emerald-300" />
            <p className="text-[10px] uppercase tracking-widest text-white/40">Step {step} of 7</p>
          </div>
        </div>

        {/* Scrollable step content — bounded so every step occupies the same box */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-2 min-h-0">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-200">Connect your school email to unlock calendar sync and course importing.</p>
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">.edu email address</Label>
              <Input type="email" value={form.edu_email} onChange={(e) => set("edu_email", e.target.value)} placeholder="you@school.edu" className="bg-black border-white/10 h-9" />
            </div>
            <p className="text-[11px] text-white/30">You can connect Google Calendar later in Settings.</p>
          </div>
        )}

        {/* STEP 2 — University */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-200">Which Canadian university do you attend?</p>
            <p className="text-[11px] text-white/40 -mt-1">We use this to autofill course details from your university's catalog and rank course difficulty.</p>
            <UniversitySelector
              value={{ name: form.university_name, domain: form.university_domain, catalogUrl: form.university_course_catalog_url }}
              onChange={(u) => { set("university_name", u?.name || ""); set("university_domain", u?.domain || ""); set("university_course_catalog_url", u?.catalogUrl || ""); }}
            />
            {form.university_name && (
              <div className="rounded-md border border-white/10 p-3 space-y-2.5">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Program (optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2"><Label className="text-[11px] text-white/50 mb-1 block">Faculty</Label><Input value={form.faculty || ""} onChange={(e) => set("faculty", e.target.value)} placeholder="e.g. Faculty of Engineering" className="bg-black border-white/10 h-9" /></div>
                  <div><Label className="text-[11px] text-white/50 mb-1 block">Degree program</Label><Input value={form.degree_program || ""} onChange={(e) => set("degree_program", e.target.value)} placeholder="e.g. Electrical Engineering" className="bg-black border-white/10 h-9" /></div>
                  <div><Label className="text-[11px] text-white/50 mb-1 block">Specialization</Label><Input value={form.specialization || ""} onChange={(e) => set("specialization", e.target.value)} placeholder="e.g. Power Systems" className="bg-black border-white/10 h-9" /></div>
                </div>
                {form.university_domain && <p className="text-[10px] text-white/30 font-mono">Domain: {form.university_domain}</p>}
                <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 px-3 py-2.5 text-[11px] text-emerald-200/80 leading-relaxed">
                  Once you complete setup, Haven will automatically find and parse your university's course catalog based on this info — so adding your courses later takes one click.
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 — Import Courses */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-200">How do you want to add your courses?</p>
            {courses.length > 0 && (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
                You have {courses.length} course{courses.length === 1 ? "" : "s"} set up. You can add more later.
              </div>
            )}
            <div className="grid grid-cols-1 gap-2.5">
              <ImportOption icon={Calendar} title="Import from Calendar" hint={connected ? "Sync from Google Calendar" : "Connect Calendar first"} disabled={!connected} onClick={() => { set("import_choice", "calendar"); next(); }} />
              <ImportOption icon={ListChecks} title="Add Manually" hint="Enter courses yourself" onClick={() => { set("import_choice", "manual"); next(); }} />
              <div className="rounded-md border border-white/10 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ImageUp className="h-4 w-4 text-emerald-300" />
                  <p className="text-sm text-zinc-100">Upload Schedule Screenshot</p>
                  {parsing === "schedule" && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300 ml-auto" />}
                </div>
                <p className="text-[10px] text-white/40 mb-2">We'll use AI to read your schedule and extract course details. Any file format works.</p>
                <FileDropzone hint="Drag & drop your schedule screenshot" onFiles={(files) => files?.[0] && parseSchedule(files[0])} />
                {parseNote && parsing !== "schedule" && <p className="text-[11px] text-white/50 mt-2">{parseNote}</p>}

                {form.screenshot_courses?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Detected courses — edit before confirming</p>
                    {form.screenshot_courses.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded border border-white/10 p-1.5">
                        <Input value={c.code} onChange={(e) => set("screenshot_courses", form.screenshot_courses.map((x, j) => j === i ? { ...x, code: e.target.value } : x))} placeholder="Code" className="h-7 w-20 bg-black border-white/10 text-xs" />
                        <Input value={c.title} onChange={(e) => set("screenshot_courses", form.screenshot_courses.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Title" className="h-7 flex-1 bg-black border-white/10 text-xs" />
                        <Input value={c.schedule_time} onChange={(e) => set("screenshot_courses", form.screenshot_courses.map((x, j) => j === i ? { ...x, schedule_time: e.target.value } : x))} placeholder="10:00-11:30" className="h-7 w-28 bg-black border-white/10 text-xs" />
                        <button onClick={() => set("screenshot_courses", form.screenshot_courses.filter((_, j) => j !== i))} className="text-white/30 hover:text-rose-300 px-1"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 — Transcript & Goals */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded-md border border-white/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-emerald-300" />
                <p className="text-sm text-zinc-100">Upload Transcript</p>
                {parsing === "transcript" && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300 ml-auto" />}
              </div>
              <p className="text-[10px] text-white/40 mb-2">We'll detect your GPA and past courses. Any file format works.</p>
              <FileDropzone hint="Drag & drop your transcript" onFiles={(files) => files?.[0] && parseTranscript(files[0])} />
              {parseNote && parsing !== "transcript" && (
                <p className="text-[11px] text-emerald-300 mt-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> {parseNote}</p>
              )}
              {form.transcript_courses?.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                  {form.transcript_courses.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-white/60">
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-mono text-emerald-300/80">{c.grade}</span>
                      <span className="font-mono text-white/40">{c.credits}cr</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Current GPA</Label>
                <Input type="number" step="0.01" min="0" max="4" value={form.gpa_current} onChange={(e) => set("gpa_current", e.target.value)} placeholder="3.2" className="bg-black border-white/10 h-9" />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Target GPA</Label>
                <Input type="number" step="0.01" min="0" max="4" value={form.gpa_target} onChange={(e) => set("gpa_target", e.target.value)} placeholder="3.7" className="bg-black border-white/10 h-9" />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Academic goals this semester</Label>
              <Textarea value={form.academic_goals} onChange={(e) => set("academic_goals", e.target.value)} placeholder="e.g. Make Dean's List, pass all courses with B+ or higher" className="bg-black border-white/10 text-sm min-h-[64px]" />
            </div>
          </div>
        )}

        {/* STEP 5 — Weekly Study Hours (compact, no scroll) */}
        {step === 5 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-white/50">Hours per week</Label>
              <span className="text-sm font-mono tabular-nums text-emerald-300">{form.weekly_study_hours}h{studyLevel ? ` · ${studyLevel.label}` : ""}</span>
            </div>
            <Slider value={[Number(form.weekly_study_hours)]} min={0} max={40} step={1} onValueChange={([v]) => set("weekly_study_hours", v)} />
            <div className="space-y-1">
              {SUGGESTIONS.map((s, i) => {
                const active = studyLevel?.label === s.label;
                return (
                  <div key={s.label} className={`flex items-start gap-2 rounded border px-2.5 py-1.5 text-[11px] transition-colors ${active ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10"}`}>
                    <span className="font-mono text-white/30 w-3 shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${active ? "text-emerald-200" : "text-zinc-200"}`}>{s.label}</span>
                        <span className="text-white/40 font-mono">{s.range}</span>
                        {active && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <span className="text-white/35 break-words leading-snug block">— {s.short}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6 — Work & Schedule */}
        {step === 6 && (
          <div className="space-y-3">
            <Label className="text-[10px] uppercase tracking-widest text-white/50">Do you have a job?</Label>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" onClick={() => set("has_job", v)} className={`flex-1 rounded-md border px-3 py-2 text-sm ${form.has_job === v ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-white/60 hover:border-white/30"}`}>
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {form.has_job && (
              <>
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Hours per week</Label>
                  <Input type="number" min="0" max="60" value={form.work_hours} onChange={(e) => set("work_hours", e.target.value)} className="bg-black border-white/10 h-9 w-32" />
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Days you typically work</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => {
                      const on = form.work_days.includes(d);
                      return (
                        <label key={d} className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs cursor-pointer ${on ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-white/60"}`}>
                          <Checkbox checked={on} onCheckedChange={() => toggleDay(d)} className="h-3.5 w-3.5" />
                          {d}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            <div className="rounded-md border border-white/10 px-3 py-2.5">
              <p className="text-xs text-zinc-200">Based on your work schedule and study goals, you have <span className="font-mono tabular-nums text-emerald-300">{remaining}h/week</span> remaining for sleep, meals, and personal time.</p>
              {remaining < 49 && (
                <p className="text-[11px] text-amber-300 mt-1.5">⚠ This schedule leaves limited time for rest. Consider reducing study or work hours.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 7 — Review */}
        {step === 7 && (
          <div className="space-y-2.5">
            <Summary k="School email" v={form.edu_email || "—"} />
            <Summary k="University" v={form.university_name ? `${form.university_name}${form.degree_program ? ` · ${form.degree_program}` : ""}` : "—"} />
            <Summary k="Courses set up" v={`${courses.length}${form.screenshot_courses?.length ? ` · ${form.screenshot_courses.length} from screenshot` : ""}`} />
            <Summary k="GPA (current / target)" v={`${form.gpa_current || "—"} / ${form.gpa_target || "—"}${form.transcript_courses?.length ? ` · ${form.transcript_courses.length} past courses` : ""}`} />
            <Summary k="Weekly study hours" v={`${form.weekly_study_hours}h${studyLevel ? ` · ${studyLevel.label}` : ""}`} />
            <Summary k="Employed" v={form.has_job ? `Yes · ${form.work_hours}h/week${form.work_days.length ? ` · ${form.work_days.join(", ")}` : ""}` : "No"} />
            {form.academic_goals && <Summary k="Goals" v={form.academic_goals} />}
          </div>
        )}

        </div>

        {/* Fixed footer — pinned below the scroll area on every step */}
        <div className="shrink-0 p-5 sm:p-6 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 1} className="text-white/60 hover:text-white">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            {step < 7 ? (
              <Button data-next onClick={next} className="bg-emerald-500 text-black hover:bg-emerald-400">
                {step === 1 && !form.edu_email ? "Skip for now — complete later in Settings" : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button data-next onClick={finish} className="bg-emerald-500 text-black hover:bg-emerald-400">
                <Check className="h-4 w-4 mr-1" /> Complete Setup
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ImportOption({ icon: Icon, title, hint, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex items-center gap-2.5 rounded-md border border-white/10 p-3 text-left w-full disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-400/30 transition-all duration-200 ease-out">
      <Icon className="h-4 w-4 text-emerald-300 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-zinc-100">{title}</p>
        <p className="text-[10px] text-white/40">{hint}</p>
      </div>
    </button>
  );
}

function Summary({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
      <p className="text-[10px] uppercase tracking-widest text-white/40 shrink-0 pt-0.5">{k}</p>
      <p className="text-sm text-zinc-100 text-right break-words">{v}</p>
    </div>
  );
}