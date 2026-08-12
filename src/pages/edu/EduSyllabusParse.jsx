import React, { useState, useMemo, useCallback } from "react";
import { Upload, CheckCircle2, AlertTriangle, X, ChevronDown, ChevronRight, Loader2, Trash2, Plus, AlertCircle, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

const ACCEPT_TYPES = ".pdf,.png,.jpg,.jpeg,.webp";
const TYPE_OPTIONS = ["assignment", "exam", "quiz", "project", "midterm", "final", "lab", "other"];

// ── Schema for the AI response — validated at parse time ──
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    courses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string" },
          title: { type: "string" },
          professor_name: { type: "string" },
          deliverables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                due_date: { type: "string" },
                due_time: { type: "string" },
                weight: { type: "number" },
                type: { type: "string" },
                is_exam: { type: "boolean" },
              },
              required: ["title"],
            },
          },
        },
        required: ["code", "title"],
      },
    },
  },
  required: ["courses"],
};

const PARSING_PROMPT = `Extract ALL courses from this syllabus document. For each course, provide:
- code (course code, e.g. CSC 110)
- title (full course name)
- professor_name (instructor name)
- deliverables: array of assignments, exams, projects, quizzes, labs, or other graded items
  For each deliverable include:
  - title (name of the assignment/exam/project)
  - due_date (due date in YYYY-MM-DD format if available)
  - due_time (due time in HH:MM format if available)
  - weight (grading weight/percentage as a number, e.g. 25)
  - type (one of: assignment, exam, quiz, project, midterm, final, lab, other)
  - is_exam (boolean, true if this is an exam/midterm/final)

Be thorough — extract every graded component listed in the syllabus. If a due date has no year, infer it from context. If weight is given as a range or "up to", use the maximum. Return ONLY valid JSON matching the schema.`;

// ── Helpers ──
function normalizeDeliverable(d) {
  return {
    title: (d.title || "").trim(),
    due_date: (d.due_date || "").slice(0, 10),
    due_time: (d.due_time || "").trim(),
    weight: Math.max(0, Number(d.weight) || 0),
    type: TYPE_OPTIONS.includes(d.type) ? d.type : "assignment",
    is_exam: !!d.is_exam,
  };
}

function normalizeCourse(c) {
  return {
    code: (c.code || "").trim(),
    title: (c.title || "").trim() || (c.code || "").trim(),
    professor_name: (c.professor_name || "").trim(),
    deliverables: (c.deliverables || []).map(normalizeDeliverable),
  };
}

function courseKey(c) {
  return c.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ── Status badge colors ──
const STATUS_STYLE = {
  idle: "border-white/10 text-white/40",
  uploading: "border-sky-400/30 text-sky-300 bg-sky-500/10",
  parsing: "border-amber-400/30 text-amber-300 bg-amber-500/10",
  review: "border-emerald-400/30 text-emerald-300 bg-emerald-500/10",
  importing: "border-indigo-400/30 text-indigo-300 bg-indigo-500/10",
  done: "border-emerald-400/30 text-emerald-300 bg-emerald-500/10",
  error: "border-rose-400/30 text-rose-300 bg-rose-500/10",
};

export default function EduSyllabusParse() {
  // ── Context ──
  const { activeSemester, courses: existingCourses, createCourse } = useEduSync();
  const { toast } = useToast();

  // ── State ──
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | parsing | review | importing | done | error
  const [parsedData, setParsedData] = useState([]); // normalized courses array
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  // ── Existing course codes for duplicate detection ──
  const existingCodes = useMemo(() => {
    return new Set((existingCourses || []).map((c) => courseKey(c)));
  }, [existingCourses]);

  // ── File handler ──
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setStatus("uploading");
    setError("");
    setParsedData([]);
    setExpanded(new Set());

    try {
      // 1. Upload file
      const up = await base44.integrations.Core.UploadFile({ file: f });
      const fileUrl = up?.data?.file_url || up?.file_url;
      if (!fileUrl) throw new Error("Upload failed — no file URL returned");

      // 2. Parse with AI
      setStatus("parsing");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: PARSING_PROMPT,
        file_urls: [fileUrl],
        response_json_schema: RESPONSE_SCHEMA,
      });
      const d = res?.data ?? res;
      const rawCourses = d?.courses || [];

      if (!rawCourses.length) {
        setStatus("error");
        setError("Could not detect any courses in the syllabus. Try a clearer file or add courses manually.");
        return;
      }

      // 3. Normalize
      const normalized = rawCourses.map(normalizeCourse);
      setParsedData(normalized);
      // Expand all by default
      setExpanded(new Set(normalized.map((_, i) => i)));
      setStatus("review");
    } catch (e) {
      setError(e?.message || "Something went wrong while parsing the syllabus.");
      setStatus("error");
    }
  }, []);

  // ── Dropzone click-through ──
  const dropzoneRef = React.useRef(null);

  // ── Courses array mutation helpers ──
  const updateCourse = useCallback((index, patch) => {
    setParsedData((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }, []);

  const removeCourse = useCallback((index) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateDeliverable = useCallback((courseIdx, delIdx, patch) => {
    setParsedData((prev) =>
      prev.map((c, ci) =>
        ci !== courseIdx
          ? c
          : {
              ...c,
              deliverables: c.deliverables.map((d, di) => (di !== delIdx ? d : { ...d, ...patch })),
            }
      )
    );
  }, []);

  const removeDeliverable = useCallback((courseIdx, delIdx) => {
    setParsedData((prev) =>
      prev.map((c, ci) =>
        ci !== courseIdx ? c : { ...c, deliverables: c.deliverables.filter((_, di) => di !== delIdx) }
      )
    );
  }, []);

  const addDeliverable = useCallback((courseIdx) => {
    setParsedData((prev) =>
      prev.map((c, ci) =>
        ci !== courseIdx
          ? c
          : {
              ...c,
              deliverables: [
                ...c.deliverables,
                { title: "", due_date: "", due_time: "", weight: 0, type: "assignment", is_exam: false },
              ],
            }
      )
    );
  }, []);

  const toggleExpand = useCallback((idx) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  // ── Import All ──
  const handleImportAll = useCallback(async () => {
    const toImport = parsedData.filter((c) => c.code || c.title);
    if (!toImport.length) return;
    if (!activeSemester?.id) {
      toast({ title: "No active semester", description: "Set an active semester before importing.", variant: "destructive" });
      return;
    }

    setStatus("importing");
    setImporting(true);
    setImportProgress({ current: 0, total: toImport.length });
    setError("");

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < toImport.length; i++) {
      const c = toImport[i];
      setImportProgress({ current: i + 1, total: toImport.length });

      try {
        // Check duplicate
        const key = courseKey(c);
        if (existingCodes.has(key)) {
          skipped++;
          continue;
        }

        // Build deliverable payloads
        const deliverables = c.deliverables
          .filter((d) => d.title)
          .map((d) => ({
            title: d.title,
            due_date: d.due_date || null,
            due_time: d.due_time || null,
            weight: d.weight,
            type: d.type,
            is_exam: d.is_exam,
            semester_id: activeSemester.id,
          }));

        await createCourse({
          course: {
            code: c.code,
            title: c.title,
            professor_name: c.professor_name || null,
            semester_id: activeSemester.id,
            credits: 3,
            target_weekly_hours: 6,
          },
          deliverables,
          materials: [],
        });
        imported++;
      } catch (e) {
        failed++;
        console.error(`Failed to import course "${c.code}":`, e);
      }
    }

    setImporting(false);

    if (failed && !imported) {
      setStatus("error");
      setError(`Failed to import any courses. Please try again.`);
    } else {
      setStatus("done");
      toast({
        title: `Imported ${imported} course${imported === 1 ? "" : "s"}`,
        description: skipped
          ? `${skipped} duplicate${skipped === 1 ? "" : "s"} skipped.`
          : failed
            ? `${failed} failed.`
            : "All courses and deliverables saved.",
      });
    }
  }, [parsedData, activeSemester, existingCodes, createCourse, toast]);

  // ── Reset ──
  const reset = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setParsedData([]);
    setError("");
    setImporting(false);
    setImportProgress({ current: 0, total: 0 });
    setExpanded(new Set());
  }, []);

  // ── Render: idle / uploading / parsing (file dropzone & spinners) ──
  function renderDropzone() {
    if (status === "uploading" || status === "parsing") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-emerald-400/40 bg-emerald-500/[0.03] p-12 text-center">
          <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
          <p className="text-sm text-white/60">
            {status === "uploading" ? "Uploading syllabus…" : "Parsing with AI…"}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-white/30">
            {status === "uploading" ? "Uploading file to server" : "Extracting courses and deliverables"}
          </p>
        </div>
      );
    }

    return (
      <div
        ref={dropzoneRef}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-emerald-400", "bg-emerald-500/10"); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove("border-emerald-400", "bg-emerald-500/10"); }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-emerald-400", "bg-emerald-500/10");
          const files = Array.from(e.dataTransfer?.files || []);
          if (files.length) handleFile(files[0]);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ACCEPT_TYPES;
          input.onchange = (e) => {
            const f = e.target?.files?.[0];
            if (f) handleFile(f);
          };
          input.click();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ACCEPT_TYPES;
            input.onchange = (ev) => {
              const f = ev.target?.files?.[0];
              if (f) handleFile(f);
            };
            input.click();
          }
        }}
        role="button"
        tabIndex={0}
        className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 p-14 text-center cursor-pointer transition-colors select-none outline-none hover:border-emerald-400/40 focus-visible:ring-2 focus-visible:ring-emerald-400/40"
      >
        <Upload className="h-10 w-10 text-emerald-400/60" />
        <div>
          <p className="text-base font-medium text-white/70">Upload a syllabus</p>
          <p className="text-sm text-white/40 mt-1">Drag & drop or click to browse</p>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-white/30">PDF · PNG · JPG · WEBP</p>
      </div>
    );
  }

  // ── Render: error ──
  function renderError() {
    if (status !== "error" || !error) return null;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4">
        <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-rose-200">Parse failed</p>
          <p className="text-xs text-rose-300/80 mt-0.5">{error}</p>
        </div>
        <button onClick={reset} aria-label="Dismiss error" className="shrink-0 text-rose-400 hover:text-rose-200 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Render: file info bar ──
  function renderFileInfo() {
    if (!file) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-white/40">
        <FileText className="h-3.5 w-3.5" />
        <span className="truncate max-w-[280px]">{file.name}</span>
        <span className="text-white/20">·</span>
        <span>{(file.size / 1024).toFixed(0)} KB</span>
        {(status === "done" || status === "error") && (
          <button onClick={reset} className="ml-auto text-rose-400 hover:text-rose-200 transition-colors text-[10px] uppercase tracking-wider font-medium">
            Remove
          </button>
        )}
      </div>
    );
  }

  // ── Render: review table ──
  function renderReview() {
    if (status !== "review" || !parsedData.length) return null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              <strong>{parsedData.length}</strong> course{parsedData.length === 1 ? "" : "s"} found
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/30">
            {parsedData.reduce((s, c) => s + c.deliverables.filter((d) => d.title).length, 0)} deliverables
          </span>
        </div>

        {/* Course cards */}
        <div className="space-y-3">
          {parsedData.map((course, ci) => {
            const key = courseKey(course);
            const isDuplicate = existingCodes.has(key) && !!course.code;
            const validDels = course.deliverables.filter((d) => d.title);
            const isOpen = expanded.has(ci);

            return (
              <div
                key={ci}
                className={`rounded-xl border ${
                  isDuplicate ? "border-amber-400/20 bg-amber-500/[0.03]" : "border-white/10 bg-black"
                } overflow-hidden`}
              >
                {/* Course header */}
                <div className="flex items-center gap-2 p-3 sm:p-4">
                  <button
                    onClick={() => toggleExpand(ci)}
                    aria-label={isOpen ? "Collapse course" : "Expand course"}
                    className="shrink-0 text-white/30 hover:text-white transition-colors"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                    <input
                      value={course.code}
                      onChange={(e) => updateCourse(ci, { code: e.target.value })}
                      placeholder="Course code"
                      className="h-8 px-2 rounded-md bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-emerald-400/40"
                    />
                    <input
                      value={course.title}
                      onChange={(e) => updateCourse(ci, { title: e.target.value })}
                      placeholder="Course title"
                      className="h-8 px-2 rounded-md bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-emerald-400/40"
                    />
                    <input
                      value={course.professor_name}
                      onChange={(e) => updateCourse(ci, { professor_name: e.target.value })}
                      placeholder="Professor"
                      className="h-8 px-2 rounded-md bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-emerald-400/40"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isDuplicate && (
                      <span className="text-[9px] uppercase tracking-widest text-amber-400/60 font-medium px-1.5 py-0.5 rounded border border-amber-400/20">
                        Duplicate
                      </span>
                    )}
                    <span className="text-[10px] text-white/30 font-mono min-w-[2rem] text-right">
                      {validDels.length} del.
                    </span>
                    <button
                      onClick={() => removeCourse(ci)}
                      className="text-white/20 hover:text-rose-400 transition-colors p-1"
                      title="Remove course"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded deliverables table */}
                {isOpen && (
                  <div className="border-t border-white/5 px-3 pb-3 sm:px-4 sm:pb-4 pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
                        Deliverables
                      </p>
                      <button
                        onClick={() => addDeliverable(ci)}
                        className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                      >
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </div>

                    {/* Header row (hidden on small screens) */}
                    <div className="hidden sm:grid grid-cols-12 gap-2 mb-1 px-2">
                      <span className="col-span-3 text-[9px] uppercase tracking-widest text-white/30">Title</span>
                      <span className="col-span-2 text-[9px] uppercase tracking-widest text-white/30">Due Date</span>
                      <span className="col-span-1 text-[9px] uppercase tracking-widest text-white/30">Time</span>
                      <span className="col-span-1 text-[9px] uppercase tracking-widest text-white/30">Weight</span>
                      <span className="col-span-2 text-[9px] uppercase tracking-widest text-white/30">Type</span>
                      <span className="col-span-2 text-[9px] uppercase tracking-widest text-white/30">Exam</span>
                      <span className="col-span-1" />
                    </div>

                    <div className="space-y-1.5">
                      {course.deliverables.map((del, di) => (
                        <div
                          key={di}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-2 items-center rounded-md bg-white/[0.02] p-2 sm:p-1.5"
                        >
                          {/* Title */}
                          <input
                            value={del.title}
                            onChange={(e) => updateDeliverable(ci, di, { title: e.target.value })}
                            placeholder="Deliverable name"
                            className="col-span-1 sm:col-span-3 h-7 px-2 rounded border border-white/10 bg-white/5 text-xs text-white placeholder-white/30 outline-none focus:border-emerald-400/40"
                          />
                          {/* Due date */}
                          <input
                            type="date"
                            value={del.due_date}
                            onChange={(e) => updateDeliverable(ci, di, { due_date: e.target.value })}
                            className="col-span-1 sm:col-span-2 h-7 px-2 rounded border border-white/10 bg-white/5 text-xs text-white outline-none focus:border-emerald-400/40 [color-scheme:dark]"
                          />
                          {/* Due time */}
                          <input
                            type="time"
                            value={del.due_time}
                            onChange={(e) => updateDeliverable(ci, di, { due_time: e.target.value })}
                            className="col-span-1 sm:col-span-1 h-7 px-2 rounded border border-white/10 bg-white/5 text-xs text-white outline-none focus:border-emerald-400/40 [color-scheme:dark]"
                          />
                          {/* Weight */}
                          <div className="col-span-1 sm:col-span-1 flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={del.weight}
                              onChange={(e) => updateDeliverable(ci, di, { weight: Number(e.target.value) })}
                              className="h-7 w-full px-2 rounded border border-white/10 bg-white/5 text-xs text-white outline-none focus:border-emerald-400/40"
                            />
                            <span className="text-[10px] text-white/30 hidden sm:inline">%</span>
                          </div>
                          {/* Type */}
                          <select
                            value={del.type}
                            onChange={(e) => updateDeliverable(ci, di, { type: e.target.value })}
                            className="col-span-1 sm:col-span-2 h-7 px-2 rounded border border-white/10 bg-white/5 text-xs text-white outline-none focus:border-emerald-400/40"
                          >
                            {TYPE_OPTIONS.map((t) => (
                              <option key={t} value={t} className="bg-black text-white">
                                {t}
                              </option>
                            ))}
                          </select>
                          {/* Is exam */}
                          <label className="col-span-1 sm:col-span-2 flex items-center gap-2 cursor-pointer text-xs text-white/50 hover:text-white/80 transition-colors">
                            <input
                              type="checkbox"
                              checked={del.is_exam}
                              onChange={(e) => updateDeliverable(ci, di, { is_exam: e.target.checked })}
                              className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400/30"
                            />
                            <span className="text-[10px]">{del.is_exam ? "Yes" : "No"}</span>
                          </label>
                          {/* Remove */}
                          <button
                            onClick={() => removeDeliverable(ci, di)}
                            className="col-span-1 sm:col-span-1 text-white/20 hover:text-rose-400 transition-colors flex justify-center"
                            title="Remove deliverable"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {course.deliverables.length === 0 && (
                      <p className="text-xs text-white/30 text-center py-3 italic">No deliverables added yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Import All button */}
        <button
          onClick={handleImportAll}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 text-black font-semibold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Import All ({parsedData.reduce((s, c) => s + c.deliverables.filter((d) => d.title).length, 0)} deliverables)
        </button>

        <p className="text-[10px] text-center text-white/30">
          Courses matching existing course codes will be skipped automatically.
        </p>
      </div>
    );
  }

  // ── Render: importing progress ──
  function renderImporting() {
    if (status !== "importing") return null;
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-10 text-center">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
        <p className="text-sm text-white/70 font-medium">Importing courses…</p>
        <div className="flex items-center gap-2">
          <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-400 transition-all duration-300"
              style={{ width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-white/40 font-mono">
            {importProgress.current}/{importProgress.total}
          </span>
        </div>
        <p className="text-[10px] text-white/30">Creating courses and deliverables in Base44</p>
      </div>
    );
  }

  // ── Render: done ──
  function renderDone() {
    if (status !== "done") return null;
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-sm text-white/70 font-medium">Import complete</p>
        <p className="text-xs text-white/40">
          {parsedData.length} course{parsedData.length === 1 ? "" : "s"} processed.
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={reset}
            className="h-9 px-5 rounded-lg border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Import another syllabus
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="dd-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Syllabus Parser</h1>
          <p className="text-sm text-white/50 mt-1">
            Upload a syllabus to extract courses and deliverables with AI.
          </p>
        </div>
        {activeSemester && (
          <div className="hidden sm:flex items-center gap-1.5 h-7 px-3 rounded-lg border border-white/10 text-[10px] text-white/40">
            <span className="font-medium text-white/60">{activeSemester.term_label}</span>
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-5">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-wider ${STATUS_STYLE[status]}`}
        >
          {status === "uploading" && <Loader2 className="h-3 w-3 animate-spin" />}
          {status === "parsing" && <Loader2 className="h-3 w-3 animate-spin" />}
          {status === "importing" && <Loader2 className="h-3 w-3 animate-spin" />}
          {status === "done" && <CheckCircle2 className="h-3 w-3" />}
          {status === "error" && <AlertCircle className="h-3 w-3" />}
          {status === "review" && <CheckCircle2 className="h-3 w-3" />}
          {status}
        </span>
        {!activeSemester && (
          <span className="text-[10px] text-amber-400/70">No active semester — courses won't be linked to a term.</span>
        )}
      </div>

      {/* Dropzone / busy spinner */}
      {["idle", "uploading", "parsing"].includes(status) && renderDropzone()}

      {/* File info */}
      {renderFileInfo()}

      {/* Error */}
      {renderError()}

      {/* Importing progress */}
      {renderImporting()}

      {/* Done state */}
      {renderDone()}

      {/* Review table */}
      {renderReview()}
    </div>
  );
}