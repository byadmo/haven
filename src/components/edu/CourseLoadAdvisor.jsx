import React, { useMemo, useState } from "react";
import { Brain, Loader2, GraduationCap, HeartPulse } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEduSync } from "@/lib/eduSyncContext";
import { Button } from "@/components/ui/button";

const LABELS = {
  Light: { bg: "bg-emerald-500/10", border: "border-emerald-400/40", text: "text-emerald-300", desc: "3-4 courses" },
  Moderate: { bg: "bg-amber-500/10", border: "border-amber-400/40", text: "text-amber-300", desc: "4-5 courses" },
  Heavy: { bg: "bg-rose-500/10", border: "border-rose-400/40", text: "text-rose-300", desc: "5-6 courses" },
};

function Field({ label, value, onChange }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-md border border-white/10 bg-black px-2.5 py-1.5 text-sm font-mono tabular-nums text-zinc-50 outline-none focus:border-emerald-400/40" />
    </div>
  );
}

export default function CourseLoadAdvisor() {
  const { courses, cumulativeGpa, transcript } = useEduSync();
  const credits = courses.reduce((s, c) => s + (c.credits || 0), 0);

  // Summarize past transcript performance so the advisor factors in real
  // past grades, not just the current semester.
  const pastGrades = useMemo(() => {
    if (!transcript || !transcript.courses?.length) return null;
    const terms = (transcript.terms || []).map((t) => `${t.term}: ${t.gpa.toFixed(2)}`).join("; ");
    const majors = (transcript.majors || []).slice(0, 3).map((m) => `${m.prefix} ${m.gpa.toFixed(2)} (${m.count} crs)`).join("; ");
    return { count: transcript.courses.length, credits: transcript.totalCredits, terms, majors };
  }, [transcript]);

  const [workHours, setWorkHours] = useState(20);
  const [workDays, setWorkDays] = useState(2);
  const [studyHrTarget, setStudyHrTarget] = useState(courses.reduce((s, c) => s + (c.target_weekly_hours || 0), 0) || 25);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const coursePerf = useMemo(() => courses.map((c) => `${c.code} (${c.credits || 3}cr)`), [courses]);

  async function advise() {
    setLoading(true); setErr(""); setResult(null);
    try {
      const prompt = `You are a helpful academic advisor suggesting next-semester course load.
Student context:
- Current cumulative GPA: ${cumulativeGpa != null ? cumulativeGpa.toFixed(2) : "unknown"}
- Credits in progress this semester: ${credits}
- Current courses: ${coursePerf.join(", ") || "none"}
- Work schedule: ${workDays} days/week, ${workHours} total work hours/week
- Target study hours/week: ${studyHrTarget}
- Past transcript: ${pastGrades ? `${pastGrades.count} prior courses, ${pastGrades.credits} credits earned. Term GPAs: ${pastGrades.terms}. Strongest depts: ${pastGrades.majors}` : "none"}

Balance work commitments with study feasibility. Recommend exactly ONE load label.
Respond ONLY as JSON with keys label (exactly "Light" | "Moderate" | "Heavy"), credits (a short range string like "9-12"), and reasoning (1-2 sentences referencing performance and work schedule).`;

      const r = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            label: { type: "string" },
            credits: { type: "string" },
            reasoning: { type: "string" },
          },
          required: ["label", "credits", "reasoning"],
        },
      });
      const d = typeof r === "object" && r !== null ? r : (() => { try { return JSON.parse(r); } catch { return null; } })();
      if (!d || !d.label || !LABELS[d.label]) throw new Error("bad response");
      setResult(d);
    } catch (e) {
      setErr("Couldn't generate a recommendation. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const style = result ? LABELS[result.label] : null;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Course Load Advisor</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <Field label="Work hrs / week" value={workHours} onChange={setWorkHours} />
        <Field label="Work days / week" value={workDays} onChange={setWorkDays} />
        <Field label="Study hrs target" value={studyHrTarget} onChange={setStudyHrTarget} />
      </div>

      <p className="text-[10px] text-white/40 mb-3">
        Current GPA: <span className="text-zinc-100 font-mono">{cumulativeGpa != null ? cumulativeGpa.toFixed(2) : "—"}</span>
        {" · "}In progress: <span className="text-zinc-100 font-mono">{credits}cr</span>
        {" · "}Courses: <span className="text-zinc-100">{courses.map((c) => c.code).join(", ") || "none"}</span>
      </p>

      <Button size="sm" onClick={advise} disabled={loading} className="bg-emerald-500 text-black hover:bg-emerald-400">
        {loading ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Analyzing…</> : <><HeartPulse className="h-3.5 w-3.5 mr-1" /> Recommend load</>}
      </Button>

      {err && <p className="text-[11px] text-rose-300 mt-3">{err}</p>}

      {result && (
        <div className={`mt-3 rounded-md border p-3 ${style ? `${style.bg} ${style.border}` : ""}`}>
          <div className="flex items-center justify-between mb-1.5">
            <p className={`text-[10px] uppercase tracking-widest font-mono ${style?.text}`}>
              {result.label} · {style?.desc}
            </p>
            <span className="text-xs font-mono tabular-nums text-zinc-100">{result.credits}cr</span>
          </div>
          <p className="text-xs text-zinc-100 leading-snug">{result.reasoning}</p>
        </div>
      )}

      <p className="text-[10px] text-white/30 mt-3 border-t border-white/5 pt-2 leading-snug">
        This is a suggestion — consult your academic advisor for official guidance.
      </p>
    </div>
  );
}