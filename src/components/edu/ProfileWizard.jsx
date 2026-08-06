import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { GraduationCap, ChevronLeft, ChevronRight, Check, Mail, Calendar, Target, Clock, Briefcase, ListChecks } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { getProfile, saveProfile } from "@/lib/eduProfile";

const SUGGESTIONS = [
  { label: "Light", range: "5–10 hrs/week", min: 5, max: 10, desc: "For lighter course loads or if you're working full-time" },
  { label: "Moderate", range: "10–15 hrs/week", min: 10, max: 15, desc: "Recommended for most students" },
  { label: "Balanced", range: "15–20 hrs/week", min: 15, max: 20, desc: "For heavier course loads or aiming for high grades" },
  { label: "Intensive", range: "20–30 hrs/week", min: 20, max: 30, desc: "For exam prep periods or very demanding semesters" },
  { label: "Maximum", range: "30–40 hrs/week", min: 30, max: 40, desc: "Only for extreme cases, not sustainable long-term" },
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STEP_ICONS = [Mail, Calendar, Target, Clock, Briefcase, ListChecks];

export default function ProfileWizard({ open, onOpenChange, onCompleted }) {
  const navigate = useNavigate();
  const { courses, settings } = useEduSync();
  const connected = !!settings?.google_synced;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    edu_email: "", gpa_current: "", gpa_target: "", academic_goals: "",
    weekly_study_hours: 15, has_job: false, work_hours: 0, work_days: [], import_choice: "",
    ...(getProfile() || {}),
  }));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const next = () => setStep((s) => Math.min(6, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const toggleDay = (d) => setForm((f) => ({
    ...f, work_days: f.work_days.includes(d) ? f.work_days.filter((x) => x !== d) : [...f.work_days, d],
  }));

  function finish() {
    saveProfile({
      edu_email: form.edu_email || "",
      gpa_current: Number(form.gpa_current) || 0,
      gpa_target: Number(form.gpa_target) || 0,
      academic_goals: form.academic_goals || "",
      weekly_study_hours: Number(form.weekly_study_hours) || 0,
      has_job: !!form.has_job,
      work_hours: Number(form.work_hours) || 0,
      work_days: form.work_days || [],
    });
    onCompleted?.();
    onOpenChange(false);
    if (form.import_choice === "manual") navigate("/education/courses");
  }

  const remaining = useMemo(() => {
    const work = form.has_job ? Number(form.work_hours) || 0 : 0;
    return Math.max(0, 168 - work - (Number(form.weekly_study_hours) || 0));
  }, [form.has_job, form.work_hours, form.weekly_study_hours]);

  const studyLevel = SUGGESTIONS.find((s) => form.weekly_study_hours >= s.min && form.weekly_study_hours <= s.max);

  const Icon = STEP_ICONS[step - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-black border-white/10">
        <DialogTitle className="text-base font-semibold text-zinc-50 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-emerald-400" /> Complete Your Profile
        </DialogTitle>

        {/* Stepper */}
        <div className="flex items-center gap-1.5 mb-3 mt-2">
          {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-emerald-500" : "bg-white/10"}`} />
          ))}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Icon className="h-3.5 w-3.5 text-emerald-300" />
          <p className="text-[10px] uppercase tracking-widest text-white/40">Step {step} of 6</p>
        </div>

        {/* STEP 1 — Connect Education Account */}
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

        {/* STEP 2 — Import Courses */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-zinc-200">How do you want to add your courses?</p>
            {courses.length > 0 && (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">
                You have {courses.length} course{courses.length === 1 ? "" : "s"} set up. You can add more later.
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!connected}
                onClick={() => { set("import_choice", "calendar"); next(); }}
                className="rounded-md border border-white/10 p-3 text-left disabled:opacity-40 disabled:cursor-not-allowed hover:border-emerald-400/30"
              >
                <Calendar className="h-4 w-4 text-emerald-300 mb-1.5" />
                <p className="text-sm text-zinc-100">Import from Calendar</p>
                <p className="text-[10px] text-white/40">{connected ? "Sync from Google Calendar" : "Connect Calendar first"}</p>
              </button>
              <button
                type="button"
                onClick={() => { set("import_choice", "manual"); next(); }}
                className="rounded-md border border-white/10 p-3 text-left hover:border-emerald-400/30"
              >
                <ListChecks className="h-4 w-4 text-emerald-300 mb-1.5" />
                <p className="text-sm text-zinc-100">Add Manually</p>
                <p className="text-[10px] text-white/40">Enter courses yourself</p>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Transcript & Goals */}
        {step === 3 && (
          <div className="space-y-3">
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
              <Textarea value={form.academic_goals} onChange={(e) => set("academic_goals", e.target.value)} placeholder="e.g. Make Dean's List, pass all courses with B+ or higher" className="bg-black border-white/10 text-sm min-h-[72px]" />
            </div>
          </div>
        )}

        {/* STEP 4 — Weekly Study Hours */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-widest text-white/50">Hours per week</Label>
              <span className="text-sm font-mono tabular-nums text-emerald-300">{form.weekly_study_hours}h{studyLevel ? ` · ${studyLevel.label}` : ""}</span>
            </div>
            <Slider value={[Number(form.weekly_study_hours)]} min={0} max={40} step={1} onValueChange={([v]) => set("weekly_study_hours", v)} />
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s, i) => {
                const active = studyLevel?.label === s.label;
                return (
                  <div key={s.label} className={`rounded-md border px-2.5 py-1.5 flex items-center gap-2.5 transition-colors ${active ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10"}`}>
                    <span className="text-[10px] font-mono tabular-nums text-white/30 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${active ? "text-emerald-200" : "text-zinc-200"}`}>{s.label} <span className="text-white/40">({s.range})</span></p>
                      <p className="text-[10px] text-white/40 truncate">{s.desc}</p>
                    </div>
                    {active && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5 — Work & Schedule */}
        {step === 5 && (
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

        {/* STEP 6 — Review & Finish */}
        {step === 6 && (
          <div className="space-y-2.5">
            <Summary k="School email" v={form.edu_email || "—"} />
            <Summary k="Courses set up" v={`${courses.length}`} />
            <Summary k="Current / Target GPA" v={`${form.gpa_current || "—"} / ${form.gpa_target || "—"}`} />
            <Summary k="Weekly study hours" v={`${form.weekly_study_hours}h${studyLevel ? ` · ${studyLevel.label}` : ""}`} />
            <Summary k="Employed" v={form.has_job ? `Yes · ${form.work_hours}h/week${form.work_days.length ? ` · ${form.work_days.join(", ")}` : ""}` : "No"} />
            {form.academic_goals && <Summary k="Goals" v={form.academic_goals} />}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <Button variant="ghost" onClick={back} disabled={step === 1} className="text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 6 ? (
            <Button onClick={next} className="bg-emerald-500 text-black hover:bg-emerald-400">
              {step === 1 && !form.edu_email ? "Skip for now" : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={finish} className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Check className="h-4 w-4 mr-1" /> Complete Setup
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
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