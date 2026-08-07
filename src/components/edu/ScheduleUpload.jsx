import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, X, AlertTriangle } from "lucide-react";
import FileDropzone from "@/components/edu/FileDropzone";
import { bestGuessTitle, researchCourse } from "@/lib/courseAutofill";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

const DAY_VALID = new Set(["M", "T", "W", "Th", "F", "S", "Su"]);

// Upload a full course schedule (any file — screenshot, PDF, CSV, class list)
// and bulk-add every detected class to the active semester at once. Reuses the
// same vision/file-URL extraction flow as the ProfileWizard schedule import.
export default function ScheduleUpload({ semesterId, onDone }) {
  const { createCourse, updateCourse, setAiResearching, settings } = useEduSync();
  const { toast } = useToast();
  const [status, setStatus] = React.useState("idle"); // idle | busy | review | error
  const [courses, setCourses] = React.useState([]);
  const [error, setError] = React.useState("");
  const [importing, setImporting] = React.useState(false);

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

  async function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    setStatus("busy");
    setError("");
    setCourses([]);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const file_url = up?.data?.file_url || up?.file_url;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          "Extract courses from this class schedule. For each course return: code (e.g. CSC 110), title, days (array of day abbreviations from M,T,W,Th,F,S,Su), time (e.g. 10:00-11:30), and location. Only include real courses visible in the file or list.",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            courses: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  title: { type: "string" },
                  days: { type: "array", items: { type: "string" } },
                  time: { type: "string" },
                  location: { type: "string" },
                },
              },
            },
          },
          required: ["courses"],
        },
      });
      const d = res?.data ?? res;
      const raw = (d?.courses || []).map((c) => ({
        code: (c.code || "").trim(),
        title: (c.title || "").trim() || bestGuessTitle(c.code) || (c.code || ""),
        schedule_days: (c.days || []).filter((x) => DAY_VALID.has(x)),
        schedule_time: (c.time || "").trim(),
        location: (c.location || "").trim(),
        credits: 3,
      }));
      // Group rows that share the same course code (e.g. a lecture + a lab for the
      // same class) into one course, preserving the differing times/parts.
      const normCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const groups = new Map();
      for (const c of raw) {
        const key = normCode(c.code) || normCode(c.title) || `__${groups.size}`;
        const partStr = [c.schedule_days.join(""), c.schedule_time].filter(Boolean).join(" ");
        const ex = groups.get(key);
        if (!ex) {
          groups.set(key, { ...c, _parts: partStr ? [partStr] : [] });
        } else {
          ex.schedule_days = Array.from(new Set([...(ex.schedule_days || []), ...(c.schedule_days || [])]));
          if (!ex.location && c.location) ex.location = c.location;
          if ((!ex.title || ex.title.toUpperCase().replace(/[^A-Z0-9]/g, "") === normCode(ex.code)) && c.title) ex.title = c.title;
          if (partStr && !ex._parts.includes(partStr)) ex._parts.push(partStr);
        }
      }
      const list = Array.from(groups.values()).map((c) => {
        const { _parts, ...rest } = c;
        return { ...rest, schedule_time: _parts.length ? _parts.join(" · ") : rest.schedule_time };
      });
      setCourses(list);
      if (list.length) {
        setStatus("review");
      } else {
        setStatus("idle");
        setError("We couldn't detect any courses — try a clearer file or add them manually.");
      }
    } catch (e) {
      setError(e?.message || "Could not parse schedule");
      setStatus("error");
    }
  }

  async function confirmImport() {
    const picks = courses.filter((c) => (c.code || "").trim() || (c.title || "").trim());
    if (!picks.length || !semesterId) return;
    setImporting(true);
    setError("");
    const saved = [];
    try {
      for (const c of picks) {
        const created = await createCourse({
          course: {
            code: (c.code || (c.title || "COURSE").slice(0, 8).toUpperCase()),
            title: c.title || bestGuessTitle(c.code) || c.code || "Course",
            schedule_days: c.schedule_days,
            schedule_time: c.schedule_time,
            location: c.location,
            credits: c.credits || 3,
            target_weekly_hours: 6,
            semester_id: semesterId,
            university_name: settings?.university_name || null,
            faculty: settings?.faculty || "",
            degree_program: settings?.degree_program || "",
            specialization: settings?.specialization || "",
          },
          deliverables: [],
          materials: [],
        });
        if (created?.id) saved.push({ id: created.id, code: c.code, title: c.title || "" });
      }
      toast({ title: `Imported ${saved.length} course${saved.length === 1 ? "" : "s"}`, description: "AI researching descriptions & difficulty in the background." });
      onDone?.();
      // After the user confirms the list, auto-parse each course's description +
      // difficulty from the web (mirrors Quick Add's per-row research) so the
      // course cards fill in after add. Fire-and-forget — survives modal close.
      for (const s of saved) {
        setAiResearching(s.id, true);
        (async () => {
          let out = null;
          try { out = await researchCourse({ code: s.code, title: s.title, university: uniObj, profile: profileObj }); }
          catch { out = null; }
          try {
            if (out) {
              const patch = {};
              if (out.description?.trim()) patch.course_description = out.description.trim();
              if (out.prerequisites?.trim()) patch.prerequisites = out.prerequisites.trim();
              if (out.difficulty_ranking) patch.difficulty_ranking = out.difficulty_ranking;
              if (out.difficulty_reason) patch.difficulty_reason = out.difficulty_reason;
              if (Object.keys(patch).length) await updateCourse(s.id, patch);
            }
          } finally {
            setAiResearching(s.id, false);
          }
        })();
      }
    } catch (e) {
      setError(e?.message || "Import failed");
      setImporting(false);
    }
  }

  if (status === "review") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-300 text-sm">
          <CheckCircle2 className="h-4 w-4" /> {courses.length} course{courses.length === 1 ? "" : "s"} detected — review then add all
        </div>
        <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
          {courses.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded border border-white/10 p-1.5">
              <Input
                value={c.code}
                onChange={(e) => setCourses((prev) => prev.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))}
                placeholder="Code"
                className="h-7 w-24 bg-black border-white/10 text-xs"
              />
              <Input
                value={c.title}
                onChange={(e) => setCourses((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                placeholder="Title"
                className="h-7 flex-1 bg-black border-white/10 text-xs"
              />
              <Input
                value={c.schedule_time}
                onChange={(e) => setCourses((prev) => prev.map((x, j) => (j === i ? { ...x, schedule_time: e.target.value } : x)))}
                placeholder="10:00-11:30"
                className="h-7 w-28 bg-black border-white/10 text-xs"
              />
              <button
                type="button"
                onClick={() => setCourses((prev) => prev.filter((_, j) => j !== i))}
                className="text-white/30 hover:text-rose-300 px-1 shrink-0"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button onClick={confirmImport} disabled={importing} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
          {importing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Adding…</> : `Add all ${courses.length} course${courses.length === 1 ? "" : "s"}`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setStatus("idle"); setCourses([]); setError(""); }} className="text-white/50 w-full">
          Use a different file
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {status === "busy" ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-400/40 bg-emerald-500/5 p-8 text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-white/60">Reading your schedule…</p>
        </div>
      ) : (
        <FileDropzone hint="Drag & drop your course schedule or class list here" onFiles={handleFiles} />
      )}
      {error && (
        <p className="text-xs text-rose-400 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}