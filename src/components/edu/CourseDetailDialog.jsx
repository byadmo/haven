import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Check } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { currentGrade, percentToLetter } from "@/lib/eduGrading";
import ProfessorContact from "@/components/edu/ProfessorContact";
import GradeCalculator from "@/components/edu/GradeCalculator";

const TYPES = ["assignment", "exam", "quiz", "project", "midterm", "final", "lab", "other"];

export default function CourseDetailDialog({ course, open, onOpenChange }) {
  const { deliverablesByCourse, materialsByCourse, createDeliverable, updateDeliverable, deleteDeliverable, createMaterial, deleteMaterial, deleteCourse } = useEduSync();
  const [dlv, setDlv] = React.useState({ title: "", due_date: "", weight: 0, type: "assignment", is_exam: false });
  const [mat, setMat] = React.useState({ title: "", estimated_cost: 0, required: true });
  const [grades, setGrades] = React.useState({});

  if (!course) return null;
  const dlvs = (deliverablesByCourse[course.id] || []).slice().sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
  const mats = materialsByCourse[course.id] || [];
  const cur = currentGrade(dlvs);
  const totalWeight = dlvs.reduce((s, d) => s + (d.weight || 0), 0);

  async function addDeliverable(e) {
    e.preventDefault();
    if (!dlv.title || !course.id) return;
    await createDeliverable({ ...dlv, course_id: course.id, max_grade: 100, completed: false, graded: false });
    setDlv({ title: "", due_date: "", weight: 0, type: "assignment", is_exam: false });
  }
  async function addMaterial(e) {
    e.preventDefault();
    if (!mat.title || !course.id) return;
    await createMaterial({ ...mat, course_id: course.id });
    setMat({ title: "", estimated_cost: 0, required: true });
  }
  async function removeCourse() {
    if (!confirm(`Delete ${course.code}? This removes all its deliverables and materials.`)) return;
    await deleteCourse(course.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{course.code} — {course.title}</DialogTitle>
          <DialogDescription className="text-white/50">
            {course.professor_name || "No professor"}{course.schedule_time ? ` · ${course.schedule_time}` : ""}{course.location ? ` · ${course.location}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          <ProfessorContact course={course} />
          {/* Grading breakdown */}
          <div className="rounded-lg border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Current grade</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-300">{cur != null ? `${cur.toFixed(1)}%` : "—"}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>Letter: <span className="text-zinc-100 font-mono">{percentToLetter(cur)}</span></span>
              <span className="font-mono tabular-nums">Weights: {totalWeight}%</span>
            </div>
            <div className="mt-2 space-y-1">
              {dlvs.map((d) => (
                <div key={d.id} className="h-1.5 bg-white/10 overflow-hidden">
                  <div className="h-full bg-emerald-500/70" style={{ width: `${Math.min(100, d.weight)}%` }} />
                </div>
              ))}
            </div>
          </div>

          <GradeCalculator course={course} deliverables={dlvs} />

          {/* Deliverables */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Deliverables ({dlvs.length})</p>
            <div className="space-y-2">
              {dlvs.map((d) => (
                <div key={d.id} className="grid grid-cols-12 gap-1.5 items-center rounded-md border border-white/10 p-2">
                  <button
                    onClick={() => updateDeliverable(d.id, { completed: !d.completed })}
                    className={`col-span-1 h-6 w-6 grid place-items-center rounded border ${d.completed ? "bg-emerald-500 border-emerald-400 text-black" : "border-white/20 text-transparent"}`}
                  ><Check className="h-3.5 w-3.5" /></button>
                  <div className="col-span-5">
                    <p className={`text-xs truncate ${d.completed ? "line-through text-white/40" : "text-zinc-100"}`}>{d.title}</p>
                    <p className="text-[10px] text-white/40 font-mono">{d.due_date} · {d.weight}% · {d.type}</p>
                  </div>
                  <Input
                    type="number" placeholder="Grade"
                    value={grades[d.id] !== undefined ? grades[d.id] : (d.grade ?? "")}
                    disabled={!d.graded}
                    onChange={(e) => setGrades((p) => ({ ...p, [d.id]: e.target.value }))}
                    onBlur={() => { if (grades[d.id] === undefined) return; updateDeliverable(d.id, { grade: grades[d.id] === "" ? null : Number(grades[d.id]) }); }}
                    className="col-span-2 bg-black border-white/10 h-7 text-xs"
                  />
                  <button onClick={() => updateDeliverable(d.id, { graded: !d.graded })} className={`col-span-2 text-[10px] uppercase tracking-widest border px-1 py-1 rounded ${d.graded ? "border-emerald-400/40 text-emerald-300" : "border-white/10 text-white/40"}`}>{d.graded ? "Graded" : "Mark"}</button>
                  <button onClick={() => deleteDeliverable(d.id)} className="col-span-2 flex justify-center text-white/40 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <form onSubmit={addDeliverable} className="mt-2 grid grid-cols-12 gap-1.5">
              <Input className="col-span-5 bg-black border-white/10 h-8 text-xs" placeholder="Deliverable title" value={dlv.title} onChange={(e) => setDlv({ ...dlv, title: e.target.value })} />
              <Input type="date" className="col-span-3 bg-black border-white/10 h-8 text-xs" value={dlv.due_date} onChange={(e) => setDlv({ ...dlv, due_date: e.target.value })} />
              <Input type="number" className="col-span-2 bg-black border-white/10 h-8 text-xs" placeholder="%" value={dlv.weight} onChange={(e) => setDlv({ ...dlv, weight: Number(e.target.value) })} />
              <Button type="submit" size="sm" className="col-span-2 bg-emerald-500 text-black hover:bg-emerald-400 h-8"><Plus className="h-3.5 w-3.5" /></Button>
            </form>
          </div>

          {/* Materials */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Materials ({mats.length})</p>
            <div className="space-y-1.5">
              {mats.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border border-white/10 p-2">
                  <div>
                    <p className="text-xs text-zinc-100">{m.title}</p>
                    <p className="text-[10px] text-white/40 font-mono tabular-nums">${(m.estimated_cost || 0).toFixed(2)} · {m.required ? "Required" : "Optional"}</p>
                  </div>
                  <button onClick={() => deleteMaterial(m.id)} className="text-white/40 hover:text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <form onSubmit={addMaterial} className="mt-2 grid grid-cols-12 gap-1.5">
              <Input className="col-span-7 bg-black border-white/10 h-8 text-xs" placeholder="Material title" value={mat.title} onChange={(e) => setMat({ ...mat, title: e.target.value })} />
              <Input type="number" className="col-span-3 bg-black border-white/10 h-8 text-xs" placeholder="Cost" value={mat.estimated_cost} onChange={(e) => setMat({ ...mat, estimated_cost: Number(e.target.value) })} />
              <Button type="submit" size="sm" className="col-span-2 bg-emerald-500 text-black hover:bg-emerald-400 h-8"><Plus className="h-3.5 w-3.5" /></Button>
            </form>
          </div>

          <Button onClick={removeCourse} variant="outline" className="w-full border-rose-400/30 text-rose-300 hover:bg-rose-500/10">Delete Course</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}