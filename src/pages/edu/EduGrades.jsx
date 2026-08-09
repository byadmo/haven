import React from "react";
import { GraduationCap, FileText, AlertTriangle, Target, Plus, Check } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import { useEduSync } from "@/lib/eduSyncContext";
import TranscriptGpa from "@/components/edu/TranscriptGpa";
import { currentGrade, projectedGrade, percentToLetter, neededForTarget } from "@/lib/eduGrading";

const LETTERS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D"];
const LETTER_PCT = { "A+": 97, A: 92, "A-": 87, "B+": 82, B: 77, "B-": 72, "C+": 67, C: 62, "C-": 57, D: 52 };

export default function EduGrades() {
  const { courses, cumulativeGpa, settings, updateSettings, updateDeliverable } = useEduSync();
  const [whatIf, setWhatIf] = React.useState({}); // deliverable_id -> score
  const [grades, setGrades] = React.useState({}); // deliverable_id -> local input
  const [targets, setTargets] = React.useState({}); // course_id -> letter
  const threshold = settings?.scholarship_threshold_gpa;

  return (
    <>
      <EduTopBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageTitle title="Grade Simulator" subtitle="What-if grades, GPA & exam prep" icon={GraduationCap} />

        {/* Transcript GPA */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-emerald-300 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-zinc-50">Transcript GPA</p>
                <p className="text-[11px] text-white/50">Upload a transcript to calculate cumulative &amp; major GPA</p>
              </div>
            </div>
            <TranscriptGpa />
          </div>
        </Reveal>

        {/* GPA tracker */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50">Cumulative GPA</p>
                <p className="text-3xl font-bold font-mono tabular-nums text-emerald-300">{cumulativeGpa != null ? cumulativeGpa.toFixed(2) : "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] uppercase tracking-widest text-white/50">Scholarship floor</Label>
                <Input type="number" step="0.01" value={threshold ?? ""} onChange={(e) => updateSettings({ scholarship_threshold_gpa: e.target.value ? Number(e.target.value) : null })} className="w-24 bg-black border-white/10" placeholder="None" />
                {threshold != null && cumulativeGpa != null && cumulativeGpa < threshold && (
                  <span className="flex items-center gap-1 text-xs text-rose-300"><AlertTriangle className="h-3.5 w-3.5" /> Below threshold</span>
                )}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Per-course what-if */}
        <div className="space-y-4">
          {courses.length === 0 && <p className="text-sm text-white/40 text-center py-10">Add courses to simulate grades.</p>}
          {courses.map((c, i) => {
            const dlvs = c.deliverables || [];
            const merged = dlvs.map((d) => ({ ...d, whatIf: whatIf[d.id] }));
            const cur = currentGrade(merged);
            const proj = projectedGrade(merged);
            const tgt = targets[c.id];
            const needed = tgt ? neededForTarget(dlvs, LETTER_PCT[tgt]) : null;
            const exams = dlvs.filter((d) => d.is_exam && d.due_date);

            return (
              <Reveal key={c.id} delay={i * 0.03}>
                <div className="rounded-lg border border-white/10 bg-black p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-mono">{c.code}</p>
                      <p className="text-sm font-semibold text-zinc-100">{c.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">{proj != null ? `${proj.toFixed(1)}%` : "—"}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/40">Project: {percentToLetter(proj)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-1.5 text-[10px] uppercase tracking-widest text-white/40 mb-1 px-1">
                    <span className="col-span-5">Deliverable</span>
                    <span className="col-span-2 text-right">Weight</span>
                    <span className="col-span-2">Grade</span>
                    <span className="col-span-3">What-if</span>
                  </div>
                  <div className="space-y-1.5">
                    {dlvs.map((d) => (
                      <div key={d.id} className="grid grid-cols-12 gap-1.5 items-center">
                        <div className="col-span-5">
                          <p className="text-xs text-zinc-100 truncate">{d.title}</p>
                          <p className="text-[10px] text-white/40 font-mono">{d.due_date} · {d.type}</p>
                        </div>
                        <span className="col-span-2 text-right text-xs font-mono tabular-nums text-white/50">{d.weight}%</span>
                        <Input
                          type="number" placeholder="—"
                          value={grades[d.id] !== undefined ? grades[d.id] : (d.grade ?? "")}
                          onChange={(e) => setGrades((p) => ({ ...p, [d.id]: e.target.value }))}
                          onBlur={() => {
                            if (grades[d.id] === undefined) return;
                            const v = grades[d.id];
                            updateDeliverable(d.id, { grade: v === "" ? null : Number(v), graded: v !== "" });
                          }}
                          className="col-span-2 bg-black border-white/10 h-8 text-xs"
                        />
                        <Input
                          type="number" placeholder="?"
                          value={whatIf[d.id] ?? ""}
                          onChange={(e) => setWhatIf((p) => ({ ...p, [d.id]: e.target.value }))}
                          disabled={d.graded && d.grade != null}
                          className="col-span-3 bg-black border-white/10 h-8 text-xs disabled:opacity-40"
                        />
                      </div>
                    ))}
                    {dlvs.length === 0 && <p className="text-xs text-white/30 py-2">No deliverables yet.</p>}
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                    <span className="text-[10px] uppercase tracking-widest text-white/50 flex items-center gap-1"><Target className="h-3 w-3" /> Target</span>
                    <Select value={targets[c.id] || ""} onValueChange={(v) => setTargets((p) => ({ ...p, [c.id]: v }))}>
                      <SelectTrigger className="w-24 bg-black border-white/10 h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent className="bg-black border-white/10">
                        {LETTERS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {tgt && (
                      <p className="text-xs text-white/60">
                        {needed == null
                          ? <span className="text-white/40">No remaining items.</span>
                          : needed > 100
                            ? <span className="text-rose-300">Needs {needed.toFixed(0)}% on remaining — likely out of reach.</span>
                            : <span className="text-emerald-300">Need ~{needed.toFixed(0)}% avg on remaining to hit {tgt}.</span>}
                      </p>
                    )}
                  </div>

                  {exams.length > 0 && <ExamSprint course={c} exams={exams} />}
                </div>
              </Reveal>
            );
          })}
        </div>
      </main>
      <EduBottomNav />
    </>
  );
}

function ExamSprint({ course, exams }) {
  const { toast } = useToast();
  const [plan, setPlan] = React.useState(null);
  const [done, setDone] = React.useState({});

  function generate(exam) {
    const examDate = new Date(exam.due_date);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(examDate); d.setDate(d.getDate() - i);
      const phase = i >= 10 ? "Review fundamentals" : i >= 6 ? "Practice problems" : i >= 3 ? "Past exams" : i >= 1 ? "Weak areas" : "Rest & light review";
      days.push({ date: d.toISOString().slice(0, 10), topic: phase, minutes: i === 0 ? 25 : 50 });
    }
    setPlan({ examTitle: exam.title, days });
    setDone({});
  }

  const exam = exams[0];
  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Exam Sprint · {exam.title} ({exam.due_date})</p>
        <Button size="sm" variant="outline" onClick={() => generate(exam)} className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10 h-7">
          <Plus className="h-3 w-3 mr-1" /> {plan ? "Regenerate" : "Generate"} 14-day plan
        </Button>
      </div>
      {plan && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          {plan.days.map((d) => {
            const key = `${exam.id}-${d.date}`;
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <button onClick={() => setDone((p) => ({ ...p, [key]: !p[key] }))} className={`h-5 w-5 grid place-items-center rounded border ${done[key] ? "bg-emerald-500 border-emerald-400 text-black" : "border-white/20 text-transparent"}`}>
                  <Check className="h-3 w-3" />
                </button>
                <span className="font-mono tabular-nums text-white/40 w-20">{d.date}</span>
                <span className={`flex-1 ${done[key] ? "line-through text-white/40" : "text-zinc-100"}`}>{d.topic}</span>
                <span className="text-white/40 font-mono">{d.minutes}m</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}