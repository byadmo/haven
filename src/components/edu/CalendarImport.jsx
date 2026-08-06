import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";

export default function CalendarImport({ semesterId, semesterStart, onDone }) {
  const { createCourse, settings } = useEduSync();
  const [status, setStatus] = React.useState(settings?.google_synced ? "idle" : "disconnected");
  const [courses, setCourses] = React.useState([]);
  const [selected, setSelected] = React.useState({});
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

  async function analyze() {
    setError("");
    setStatus("loading");
    setLoading(true);
    setCourses([]);
    setSelected({});
    try {
      const res = await base44.functions.invoke("parseCalendarCourses", { week_start: semesterStart });
      const out = res?.data ?? res;
      const list = out?.courses || [];
      if (!list.length) {
        setStatus("empty");
        setError(out?.message || "No recurring courses detected in the first week of your semester.");
        setLoading(false);
        return;
      }
      setCourses(list);
      setSelected(Object.fromEntries(list.map((_, i) => [i, true])));
      setStatus("review");
    } catch (e) {
      setError(e?.message || "Could not analyze calendar. Make sure Google Calendar is connected.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    const picks = courses.filter((_, i) => selected[i]);
    if (!picks.length) return;
    setImporting(true);
    setError("");
    try {
      for (const c of picks) {
        await createCourse({
          course: {
            code: c.code || c.title.slice(0, 8).toUpperCase(),
            title: c.title,
            professor_name: c.professor_name || "",
            professor_email: "",
            office_hours: "",
            schedule_days: c.schedule_days || [],
            schedule_time: c.schedule_time || "",
            location: c.location || "",
            target_weekly_hours: c.target_weekly_hours || 6,
            credits: c.credits || 3,
            semester_id: semesterId,
          },
          deliverables: [],
          materials: [],
        });
      }
      onDone();
    } catch (e) {
      setError(e?.message || "Import failed");
      setImporting(false);
    }
  }

  function toggle(i) { setSelected((p) => ({ ...p, [i]: !p[i] })); }

  if (status === "disconnected") {
    return (
      <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-5 text-center">
        <AlertTriangle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
        <p className="text-sm text-zinc-100">Google Calendar isn't connected yet.</p>
        <p className="text-[11px] text-white/40 mt-1">Connect it in Settings → Google Calendar, then come back to import your schedule.</p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-3" />
        <p className="text-sm text-white/70">Analyzing your calendar…</p>
        <p className="text-[11px] text-white/40 mt-1">Detecting recurring class patterns…</p>
      </div>
    );
  }

  if (status === "review") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-300 text-sm">
          <CheckCircle2 className="h-4 w-4" /> {courses.length} course{courses.length === 1 ? "" : "s"} detected
        </div>
        <p className="text-[11px] text-white/40">Select the courses to import. Use "Upload Syllabus" afterward to enrich each with deliverables & materials.</p>
        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {courses.map((c, i) => (
            <button key={i} onClick={() => toggle(i)} className={`w-full text-left rounded-md border p-3 transition-colors ${selected[i] ? "border-emerald-400/40 bg-emerald-500/10" : "border-white/10 bg-black"}`}>
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 h-4 w-4 rounded border grid place-items-center shrink-0 ${selected[i] ? "bg-emerald-500 border-emerald-400 text-black" : "border-white/20"}`}>
                  {selected[i] && <CheckCircle2 className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-100 truncate">{c.title}</p>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono">{c.code || "—"}</p>
                  <p className="text-[11px] text-white/40 font-mono mt-0.5">{(c.schedule_days || []).join(", ")} · {c.schedule_time || "time?"}{c.location ? ` · ${c.location}` : ""}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Button onClick={confirmImport} disabled={importing} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">{importing ? "Importing…" : "Import selected"}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 text-center">
        <CalendarClock className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm text-zinc-100">Import courses from your Google Calendar</p>
        <p className="text-[11px] text-white/40 mt-1">We'll scan the first week of {semesterStart ? <span className="font-mono">{semesterStart}</span> : "your semester"} and detect recurring classes using AI.</p>
      </div>
      {error && (status === "empty" || status === "error") && <p className="text-xs text-rose-400 text-center">{error}</p>}
      <Button onClick={analyze} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">Analyze my calendar</Button>
      {!semesterId && <p className="text-[10px] text-white/40 text-center">Create an active semester first.</p>}
    </div>
  );
}