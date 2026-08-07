import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Plus, FileText, ExternalLink, Link2 } from "lucide-react";
import FileDropzone from "@/components/edu/FileDropzone";
import { bestGuessTitle, researchCourse } from "@/lib/courseAutofill";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

const DAYS = ["M", "T", "W", "Th", "F", "S", "Su"];
const TYPES = ["assignment", "exam", "quiz", "project", "midterm", "final", "lab", "other"];
const normCode = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Course Outline upload — drop the outline, AI detects which course it belongs
// to, matches it against the user's existing courses in the active semester, and
// attaches the file to that course (viewable online anytime + readable by
// EduSync AI). No matching course → a new one is created with parsed
// deliverables/materials and background-researched description/difficulty.
export default function CourseOutlineUpload({ semesterId, onDone }) {
  const { createCourse, updateCourse, createDeliverable, courses, deliverablesByCourse, settings, setAiResearching } = useEduSync();
  const { toast } = useToast();
  const [file, setFile] = React.useState(null);
  const [fileUrl, setFileUrl] = React.useState("");
  const [status, setStatus] = React.useState("idle"); // idle | uploading | parsing | review | error | saving
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");

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

  const existingMatch = React.useMemo(() => {
    if (!data?.code || !courses?.length) return null;
    const key = normCode(data.code);
    return courses.find((c) => c.semester_id === semesterId && normCode(c.code) === key) || null;
  }, [data?.code, courses, semesterId]);

  async function handleFile(f) {
    if (!f) return;
    setFile(f);
    setStatus("uploading");
    setError("");
    try {
      const up = await base44.integrations.Core.UploadFile({ file: f });
      const url = up?.data?.file_url || up?.file_url;
      setFileUrl(url);
      setStatus("parsing");
      const parsed = await base44.functions.invoke("parseSyllabus", { file_url: url });
      const out = parsed?.data ?? parsed;
      setData({
        code: out?.code || "",
        title: out?.title?.trim() || bestGuessTitle(out?.code) || out?.code || "",
        professor_name: out?.professor_name || "",
        professor_email: out?.professor_email || "",
        office_hours: out?.office_hours || "",
        schedule_days: out?.schedule_days || [],
        schedule_time: out?.schedule_time || "",
        location: out?.location || "",
        target_weekly_hours: out?.target_weekly_hours || 6,
        credits: out?.credits || 3,
        course_description: out?.course_description || "",
        deliverables: (out?.deliverables || []).map((d) => ({
          title: d.title || "",
          due_date: (d.due_date || "").slice(0, 10),
          weight: Number(d.weight) || 0,
          type: TYPES.includes(d.type) ? d.type : "assignment",
          is_exam: !!d.is_exam,
        })),
        materials: (out?.materials || []).map((m) => ({
          title: m.title || "",
          estimated_cost: Number(m.estimated_cost) || 0,
          required: m.required !== false,
        })),
      });
      setStatus("review");
    } catch (e) {
      setError(e?.message || "Could not parse outline");
      setStatus("error");
    }
  }

  function toggleDay(d) {
    setData((p) => {
      const has = p.schedule_days.includes(d);
      return { ...p, schedule_days: has ? p.schedule_days.filter((x) => x !== d) : [...p.schedule_days, d] };
    });
  }

  async function confirm() {
    if (!data || !semesterId) return;
    setStatus("saving");
    setError("");
    const outline = { outline_file_url: fileUrl, outline_file_name: file?.name || "outline" };
    try {
      if (existingMatch) {
        // Attach the outline to the existing course and fill any blank fields.
        const patch = { ...outline };
        if (!existingMatch.course_description && data.course_description) patch.course_description = data.course_description;
        if (!existingMatch.professor_name && data.professor_name) patch.professor_name = data.professor_name;
        if (!existingMatch.professor_email && data.professor_email) patch.professor_email = data.professor_email;
        if (!existingMatch.office_hours && data.office_hours) patch.office_hours = data.office_hours;
        if (!existingMatch.location && data.location) patch.location = data.location;
        await updateCourse(existingMatch.id, patch);
        // Merge deliverables that don't already exist (by title).
        const existingDlv = (deliverablesByCourse[existingMatch.id] || []).map((d) => (d.title || "").toLowerCase());
        for (const d of data.deliverables.filter((x) => x.title && !existingDlv.includes(x.title.toLowerCase()))) {
          await createDeliverable({ ...d, course_id: existingMatch.id, max_grade: 100, completed: false, graded: false });
        }
        toast({ title: `Outline attached to ${existingMatch.code}${existingMatch.title ? ` — ${existingMatch.title}` : ""}`, description: "Open it from the course anytime." });
        onDone?.();
      } else {
        const created = await createCourse({
          course: {
            code: data.code || (data.title || "COURSE").slice(0, 8).toUpperCase(),
            title: data.title,
            professor_name: data.professor_name, professor_email: data.professor_email,
            office_hours: data.office_hours, schedule_days: data.schedule_days, schedule_time: data.schedule_time,
            location: data.location, target_weekly_hours: data.target_weekly_hours, credits: data.credits,
            course_description: data.course_description,
            semester_id: semesterId, university_name: settings?.university_name || null,
            faculty: settings?.faculty || "", degree_program: settings?.degree_program || "", specialization: settings?.specialization || "",
            ...outline,
          },
          deliverables: data.deliverables.filter((d) => d.title),
          materials: data.materials.filter((m) => m.title),
        });
        toast({ title: "Course added with outline attached", description: "AI researching description & difficulty in the background." });
        onDone?.();
        // Background-research description + difficulty from the web for the new course.
        if (created?.id) {
          setAiResearching(created.id, true);
          (async () => {
            let out = null;
            try { out = await researchCourse({ code: data.code, title: data.title, university: uniObj, profile: profileObj }); }
            catch { out = null; }
            try {
              if (out) {
                const patch = {};
                if (out.description?.trim() && !data.course_description) patch.course_description = out.description.trim();
                if (out.prerequisites?.trim()) patch.prerequisites = out.prerequisites.trim();
                if (out.difficulty_ranking) patch.difficulty_ranking = out.difficulty_ranking;
                if (out.difficulty_reason) patch.difficulty_reason = out.difficulty_reason;
                if (Object.keys(patch).length) await updateCourse(created.id, patch);
              }
            } finally { setAiResearching(created.id, false); }
          })();
        }
      }
    } catch (e) {
      setError(e?.message || "Save failed");
      setStatus("review");
    }
  }

  if (status === "review" && data) {
    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className={`flex items-center gap-2 text-sm rounded-md border px-3 py-1.5 ${existingMatch ? "border-emerald-400/30 bg-emerald-500/5 text-emerald-300" : "border-sky-400/30 bg-sky-500/5 text-sky-300"}`}>
          {existingMatch ? <Link2 className="h-4 w-4 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
          {existingMatch
            ? <span>Detected <b className="font-mono">{existingMatch.code}</b> — outline attaches to your existing course.</span>
            : <span>Detected <b className="font-mono">{data.code || "new course"}</b> — no matching course, a new one will be created.</span>}
        </div>

        <div className="rounded-md border border-white/10 p-2.5 flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-300/70 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-100 truncate">{file?.name || "outline"}</p>
            <p className="text-[10px] text-white/40">Attached & viewable from the course anytime</p>
          </div>
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-emerald-300 hover:text-emerald-200 shrink-0" title="View file"><ExternalLink className="h-3.5 w-3.5" /></a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-white/50 text-xs">Code</Label><Input value={data.code} onChange={(e) => setData({ ...data, code: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Title</Label><Input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Professor</Label><Input value={data.professor_name} onChange={(e) => setData({ ...data, professor_name: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Email</Label><Input value={data.professor_email} onChange={(e) => setData({ ...data, professor_email: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Office Hours</Label><Input value={data.office_hours} onChange={(e) => setData({ ...data, office_hours: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Time</Label><Input value={data.schedule_time} onChange={(e) => setData({ ...data, schedule_time: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Location</Label><Input value={data.location} onChange={(e) => setData({ ...data, location: e.target.value })} className="bg-black border-white/10" /></div>
          <div><Label className="text-white/50 text-xs">Credits</Label><Input type="number" value={data.credits} onChange={(e) => setData({ ...data, credits: Number(e.target.value) })} className="bg-black border-white/10" /></div>
        </div>

        <div>
          <Label className="text-white/50 text-xs">Schedule days</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {DAYS.map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)} className={`h-8 w-10 rounded-md border text-xs ${data.schedule_days.includes(d) ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50"}`}>{d}</button>
            ))}
          </div>
        </div>

        {data.deliverables.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Deliverables ({data.deliverables.length})</p>
            <div className="space-y-2">
              {data.deliverables.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                  <Input className="col-span-5 bg-black border-white/10" value={d.title} onChange={(e) => { const a = [...data.deliverables]; a[i] = { ...d, title: e.target.value }; setData({ ...data, deliverables: a }); }} placeholder="Title" />
                  <Input type="date" className="col-span-3 bg-black border-white/10" value={d.due_date} onChange={(e) => { const a = [...data.deliverables]; a[i] = { ...d, due_date: e.target.value }; setData({ ...data, deliverables: a }); }} />
                  <Input type="number" className="col-span-2 bg-black border-white/10" value={d.weight} onChange={(e) => { const a = [...data.deliverables]; a[i] = { ...d, weight: Number(e.target.value) }; setData({ ...data, deliverables: a }); }} />
                  <button onClick={() => setData({ ...data, deliverables: data.deliverables.filter((_, j) => j !== i) })} className="col-span-2 text-white/40 hover:text-rose-400 text-xs flex items-center justify-center gap-1"><Trash2 className="h-3.5 w-3.5" />{d.weight}%</button>
                </div>
              ))}
              <button onClick={() => setData({ ...data, deliverables: [...data.deliverables, { title: "", due_date: "", weight: 0, type: "assignment", is_exam: false }] })} className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><Plus className="h-3 w-3" /> Add deliverable</button>
            </div>
          </div>
        )}

        {data.materials.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Materials ({data.materials.length})</p>
            <div className="space-y-2">
              {data.materials.map((m, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                  <Input className="col-span-7 bg-black border-white/10" value={m.title} onChange={(e) => { const a = [...data.materials]; a[i] = { ...m, title: e.target.value }; setData({ ...data, materials: a }); }} placeholder="Material title" />
                  <Input type="number" className="col-span-3 bg-black border-white/10" value={m.estimated_cost} onChange={(e) => { const a = [...data.materials]; a[i] = { ...m, estimated_cost: Number(e.target.value) }; setData({ ...data, materials: a }); }} />
                  <button onClick={() => setData({ ...data, materials: data.materials.filter((_, j) => j !== i) })} className="col-span-2 text-white/40 hover:text-rose-400 flex justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button onClick={() => setData({ ...data, materials: [...data.materials, { title: "", estimated_cost: 0, required: true }] })} className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"><Plus className="h-3 w-3" /> Add material</button>
            </div>
          </div>
        )}

        <Button onClick={confirm} disabled={status === "saving"} className="w-full bg-emerald-500 text-black hover:bg-emerald-400">
          {status === "saving" ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving…</> : (existingMatch ? "Attach outline" : "Add course with outline")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {status === "uploading" || status === "parsing" || status === "saving" ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-400/40 bg-emerald-500/5 p-8 text-center">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-sm text-white/60">{status === "uploading" ? "Uploading outline…" : status === "parsing" ? "Reading outline with AI…" : "Saving…"}</p>
        </div>
      ) : (
        <FileDropzone hint="Drag & drop your course outline here" onFiles={(files) => files?.[0] && handleFile(files[0])} />
      )}
      {file && status !== "review" && <p className="text-xs text-white/40 text-center">{file.name}</p>}
      {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
    </div>
  );
}