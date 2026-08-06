import React from "react";
import { Upload, FileText, Loader2, Plus, Trash2, Save, BarChart3, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useEduSync } from "@/lib/eduSyncContext";
import { computeTranscript, snapshot, percentToLetter } from "@/lib/transcriptGpa";

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    courses: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string", description: "e.g. Fall 2024" },
          code: { type: "string", description: "Course code e.g. CSC110" },
          title: { type: "string" },
          grade_percent: { type: "number", description: "Numeric grade percentage if available, else null" },
          letter: { type: "string", description: "Letter grade e.g. A+, B-. Empty if not present." },
          credit_hours: { type: "number", description: "Credit hours / units" },
        },
        required: ["term", "code", "title"],
      },
    },
  },
  required: ["courses"],
};

function StatCard({ label, value, sub, accent }) {
  const cls = accent ? "border-emerald-400/30 bg-emerald-500/[0.06]" : "border-white/10 bg-black";
  const val = accent ? "text-emerald-300" : "text-zinc-50";
  return (
    <div className={"rounded-lg border p-3 " + cls}>
      <p className="text-[10px] uppercase tracking-widest text-white/50">{label}</p>
      <p className={"text-2xl font-bold font-mono tabular-nums " + val}>{value}</p>
      {sub ? <p className="text-[10px] text-white/40 font-mono mt-0.5">{sub}</p> : null}
    </div>
  );
}

export default function TranscriptGpa() {
  const { settings, updateSettings } = useEduSync();
  const { toast } = useToast();
  const [courses, setCourses] = React.useState([]);
  const [hasParsed, setHasParsed] = React.useState(false);
  const [parsing, setParsing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef(null);
  const inputRef2 = React.useRef(null);

  React.useEffect(() => {
    const t = settings?.transcript;
    if (t && Array.isArray(t.courses) && t.courses.length) {
      setCourses(t.courses);
      setHasParsed(true);
    }
  }, [settings?.transcript]);

  const transcript = React.useMemo(() => computeTranscript(courses), [courses]);

  async function handleFile(file) {
    if (!file) return;
    setParsing(true);
    setHasParsed(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const file_url = up?.data?.file_url || up?.file_url;
      if (!file_url) throw new Error("Upload failed");
      const res = await base44.integrations.Core.InvokeLLM({
        prompt:
          "Extract every course from this academic transcript. For each course return: term (e.g. Fall 2024), course code (e.g. CSC110), course title, grade_percent (numeric percentage if shown, else null), letter (letter grade if shown, else empty string), and credit_hours (numeric). Preserve the original term labels. If a field is not present in the transcript, use null or empty — do not invent values.",
        file_urls: [file_url],
        response_json_schema: EXTRACT_SCHEMA,
      });
      const data = res?.data ?? res;
      const parsed = data?.courses || [];
      if (!parsed.length) {
        toast({ title: "No courses found", description: "Could not detect courses in that file.", variant: "destructive" });
        setParsing(false);
        return;
      }
      setCourses(parsed);
      toast({ title: "Transcript parsed", description: parsed.length + " courses detected — review and edit if needed." });
    } catch (e) {
      toast({ title: "Parse failed", description: e.message || "Could not read the transcript.", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function updateRow(i, patch) {
    setCourses((p) => p.map((c, idx) => (idx === i ? Object.assign({}, c, patch) : c)));
  }
  function addRow() {
    setCourses((p) => p.concat([{ term: "", code: "", title: "", grade_percent: null, letter: "", credit_hours: 3 }]));
  }
  function removeRow(i) {
    setCourses((p) => p.filter((_, idx) => idx !== i));
  }

  async function saveToProfile() {
    setSaving(true);
    try {
      await updateSettings({ transcript: snapshot(transcript) });
      toast({ title: "Saved to profile", description: "Cumulative GPA " + transcript.cumulativeGpa.toFixed(2) + " · " + transcript.totalCredits + " credits stored." });
    } catch (e) {
      toast({ title: "Save failed", description: e.message || "Could not save.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {!hasParsed && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current && inputRef.current.click()}
          className={"rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors " + (dragOver ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/15 bg-white/[0.02] hover:border-emerald-400/30")}
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,image/*" className="hidden" onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
          {parsing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-300" />
              <p className="text-sm text-white/60">AI is reading your transcript…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-7 w-7 text-emerald-300" />
              <p className="text-sm text-zinc-100 font-medium">Upload Transcript</p>
              <p className="text-[11px] text-white/50">Drag & drop or click · PDF, DOCX, TXT, or image</p>
            </div>
          )}
        </div>
      )}

      {hasParsed && parsing && (
        <div className="flex items-center justify-center gap-2 py-8 text-white/60 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-300" /> Parsing transcript…
        </div>
      )}

      {hasParsed && !parsing ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Cumulative GPA" value={transcript.cumulativeGpa.toFixed(2)} accent={true} />
            <StatCard label="Total Credits" value={transcript.totalCredits} />
            <StatCard label="Quality Points" value={transcript.totalQualityPoints.toFixed(1)} />
            <StatCard label="Major GPA" value={transcript.major ? transcript.majorGpa.toFixed(2) : "—"} sub={transcript.major ? transcript.major.prefix : ""} />
          </div>

          {transcript.terms.length > 1 ? (
            <div className="rounded-lg border border-white/10 bg-black p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-300" />
                <p className="text-[10px] uppercase tracking-widest text-white/50">GPA Trend by Term</p>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={transcript.terms.map((t) => ({ term: t.term, gpa: t.gpa }))} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="term" tick={{ fontSize: 9, fill: "#ffffff80" }} stroke="#ffffff20" />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 9, fill: "#ffffff80" }} stroke="#ffffff20" />
                    <Tooltip contentStyle={{ background: "#000", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#fff" }} formatter={(v) => [Number(v).toFixed(2), "GPA"]} />
                    <Line type="monotone" dataKey="gpa" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-white/10 bg-black overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/50 flex items-center gap-1.5"><FileText className="h-3 w-3" /> Parsed Courses ({courses.length})</p>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={addRow} className="h-7 text-xs text-white/70 hover:text-emerald-300"><Plus className="h-3 w-3 mr-1" /> Row</Button>
                <Button size="sm" onClick={saveToProfile} disabled={saving || courses.length === 0} className="h-7 bg-emerald-500 text-black hover:bg-emerald-400">
                  {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Add to Profile
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-black">
                  <tr className="text-[10px] uppercase tracking-widest text-white/40">
                    <th className="text-left font-medium px-2 py-1.5">Term</th>
                    <th className="text-left font-medium px-2 py-1.5">Code</th>
                    <th className="text-left font-medium px-2 py-1.5">Title</th>
                    <th className="text-right font-medium px-2 py-1.5">Grade %</th>
                    <th className="text-left font-medium px-2 py-1.5">Letter</th>
                    <th className="text-right font-medium px-2 py-1.5">Credits</th>
                    <th className="text-right font-medium px-2 py-1.5">QP</th>
                    <th className="px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c, i) => {
                    const t = computeTranscript([c]);
                    const rowLetter = c.letter || (c.grade_percent != null ? percentToLetter(c.grade_percent) : "");
                    return (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-2 py-1"><Input value={c.term || ""} onChange={(e) => updateRow(i, { term: e.target.value })} className="h-7 bg-transparent border-white/10 text-xs w-24" /></td>
                        <td className="px-2 py-1"><Input value={c.code || ""} onChange={(e) => updateRow(i, { code: e.target.value })} className="h-7 bg-transparent border-white/10 text-xs w-20 font-mono" /></td>
                        <td className="px-2 py-1"><Input value={c.title || ""} onChange={(e) => updateRow(i, { title: e.target.value })} className="h-7 bg-transparent border-white/10 text-xs w-36" /></td>
                        <td className="px-2 py-1"><Input type="number" value={c.grade_percent == null ? "" : c.grade_percent} onChange={(e) => updateRow(i, { grade_percent: e.target.value === "" ? null : Number(e.target.value), letter: "" })} placeholder="—" className="h-7 bg-transparent border-white/10 text-xs w-16 text-right font-mono" /></td>
                        <td className="px-2 py-1"><Input value={c.letter || ""} onChange={(e) => updateRow(i, { letter: e.target.value })} placeholder={rowLetter || "—"} className="h-7 bg-transparent border-white/10 text-xs w-12 font-mono" /></td>
                        <td className="px-2 py-1"><Input type="number" value={c.credit_hours == null ? "" : c.credit_hours} onChange={(e) => updateRow(i, { credit_hours: e.target.value === "" ? 0 : Number(e.target.value) })} className="h-7 bg-transparent border-white/10 text-xs w-14 text-right font-mono" /></td>
                        <td className="px-2 py-1 text-right font-mono tabular-nums text-white/60">{t.courses[0].quality_points.toFixed(1)}</td>
                        <td className="px-2 py-1 text-right"><button onClick={() => removeRow(i)} className="text-white/30 hover:text-rose-300"><Trash2 className="h-3 w-3" /></button></td>
                      </tr>
                    );
                  })}
                  {courses.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-white/30 py-6 text-xs">No courses yet — add rows or upload a transcript.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {transcript.terms.length > 0 ? (
            <div className="rounded-lg border border-white/10 bg-black p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Breakdown by Term</p>
              <div className="space-y-1">
                {transcript.terms.map((t) => (
                  <div key={t.term} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                    <span className="text-zinc-100">{t.term}</span>
                    <span className="text-white/40 font-mono">{t.credits} cr</span>
                    <span className="text-emerald-300 font-mono tabular-nums">{t.gpa.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {transcript.majors.length > 0 ? (
            <div className="rounded-lg border border-white/10 bg-black p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2 flex items-center gap-1.5"><Award className="h-3 w-3" /> Major GPA by Department</p>
              <div className="space-y-1">
                {transcript.majors.map((m) => (
                  <div key={m.prefix} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                    <span className="text-zinc-100 font-mono">{m.prefix} <span className="text-white/40">· {m.count} courses</span></span>
                    <span className="text-white/40 font-mono">{m.credits} cr</span>
                    <span className={"font-mono tabular-nums " + (m.prefix === (transcript.major && transcript.major.prefix) ? "text-emerald-300" : "text-white/60")}>{m.gpa.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <button onClick={() => inputRef2.current && inputRef2.current.click()} className="text-[11px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
            <Upload className="h-3 w-3" /> Upload a different transcript
          </button>
          <input ref={inputRef2} type="file" accept=".pdf,.docx,.txt,image/*" className="hidden" onChange={(e) => handleFile(e.target.files && e.target.files[0])} />
        </>
      ) : null}
    </div>
  );
}