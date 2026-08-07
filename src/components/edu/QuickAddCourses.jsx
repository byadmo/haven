import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPlus, Loader2, Sparkles, X } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { researchCourse } from "@/lib/courseAutofill";

// Difficulty → dot color, shared with CourseFormModal's diffDot helper.
const DIFF_DOT = {
  Easy: "bg-emerald-400",
  Moderate: "bg-lime-400",
  Hard: "bg-amber-400",
  "Very Hard": "bg-orange-400",
  Brutal: "bg-rose-500",
};

function newRow() {
  return { rid: Math.random().toString(36).slice(2), raw: "", status: "input", courseId: null, result: null };
}

// Quick-Add Courses: a dynamic stack of input boxes — typing into the last
// box spawns a new empty one underneath it. On "Add & Research", each filled
// box is saved immediately; that box then morphs into a pill (loading spinner
// while the AI research runs in the background, then a colored dot matching
// the discovered difficulty). The box only becomes a pill once its course is
// done; an empty box at the bottom stays open for the next entry.
export default function QuickAddCourses({ open, onOpenChange, semesterId }) {
  const { createCourse, updateCourse, setAiResearching, settings } = useEduSync();
  const { toast } = useToast();

  const [rows, setRows] = React.useState(() => [newRow()]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setRows([newRow()]);
      setSaving(false);
    }
  }, [open]);

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

  function patchRow(rid, patch) {
    setRows((r) => r.map((row) => (row.rid === rid ? { ...row, ...patch } : row)));
  }

  function onType(rid, val) {
    setRows((r) => {
      const updated = r.map((row) => (row.rid === rid ? { ...row, raw: val, status: "input" } : row));
      // Spawn a brand new box underneath as soon as something is typed in the
      // last row. Each subsequent typed row gets its own trailing-empty row.
      const last = updated[updated.length - 1];
      if (last.rid === rid && val.trim().length > 0) {
        return [...updated, newRow()];
      }
      return updated;
    });
  }

  function removeRow(rid) {
    setRows((r) => {
      const out = r.filter((row) => row.rid !== rid);
      if (out.length === 0) return [newRow()];
      if (out[out.length - 1].raw.trim()) return [...out, newRow()];
      return out;
    });
  }

  function isValidCode(s) {
    return s && s.length >= 2 && /^[A-Za-z]/.test(s);
  }

  async function handleAdd() {
    if (!semesterId) {
      toast({ title: "No active semester", description: "Create a semester in the dashboard first.", variant: "destructive" });
      return;
    }
    // Preserve order; drop duplicate codes (first wins).
    const seen = new Set();
    const pending = rows
      .filter((row) => row.status === "input" && isValidCode(row.raw.trim().toUpperCase()))
      .filter((row) => {
        const k = row.raw.trim().toUpperCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    if (!pending.length) {
      toast({ title: "No course codes", description: "Type a code in each box first.", variant: "destructive" });
      return;
    }
    setSaving(true);
    let created = 0;
    for (const row of pending) {
      const code = row.raw.trim().toUpperCase();
      const rid = row.rid;
      try {
        const c = await createCourse({
          course: {
            code,
            title: code,
            semester_id: semesterId,
            credits: 3,
            target_weekly_hours: 6,
            university_name: settings?.university_name || null,
            faculty: settings?.faculty || "",
            degree_program: settings?.degree_program || "",
            specialization: settings?.specialization || "",
          },
          deliverables: [],
          materials: [],
        });
        created++;
        // Morph the input box into a pill that shows research-in-progress.
        patchRow(rid, { status: "researching", courseId: c?.id || null, raw: code });
        if (c?.id) {
          setAiResearching(c.id, true);
          (async () => {
            try {
              const out = await researchCourse({ code, title: "", university: uniObj, profile: profileObj });
              if (!out) return;
              const patch = {};
              if (out.description?.trim()) patch.course_description = out.description.trim();
              if (out.prerequisites?.trim()) patch.prerequisites = out.prerequisites.trim();
              if (out.difficulty_ranking) patch.difficulty_ranking = out.difficulty_ranking;
              if (out.difficulty_reason) patch.difficulty_reason = out.difficulty_reason;
              if (Object.keys(patch).length) await updateCourse(c.id, patch);
              // Once AI is done, finalize the pill with the discovered difficulty.
              patchRow(rid, { status: "done", result: out });
            } catch (e) {
              patchRow(rid, { status: "done", result: null });
            } finally {
              setAiResearching(c.id, false);
            }
          })();
        }
      } catch (e) {
        // Leave the row as an input box so the user can retry this specific code.
        patchRow(rid, { status: "input" });
      }
    }
    setSaving(false);
    if (created > 0) {
      toast({ title: `Added ${created} course${created === 1 ? "" : "s"}`, description: "AI is researching description & difficulty in the background." });
    } else {
      toast({ title: "Could not add courses", description: "Try again in a moment.", variant: "destructive" });
    }
  }

  const enteredCount = rows.filter((r) => r.status === "input" && isValidCode(r.raw.trim().toUpperCase())).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-emerald-400" /> Quick Add Courses
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Type a code in each box — a new box appears underneath as you fill them. Tap Add &amp; Research to save; each box becomes a pill as AI finishes it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <Label className="text-white/50">Course codes</Label>
          <div className="space-y-1.5 mt-1">
            {rows.map((row) => (
              <Row key={row.rid} row={row} onType={onType} onRemove={removeRow} />
            ))}
          </div>
          {enteredCount > 0 && (
            <p className="text-[10px] text-white/40 mt-1">
              {enteredCount} code{enteredCount === 1 ? "" : "s"} ready to add
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild><Button type="button" variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Cancel</Button></DialogClose>
          <Button type="button" onClick={handleAdd} disabled={saving || enteredCount === 0} className="bg-emerald-500 text-black hover:bg-emerald-400">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Sparkles className="h-4 w-4" /> Add &amp; Research</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ row, onType, onRemove }) {
  // Once the course is saved + AI starts running, the input box becomes a pill.
  if (row.status === "researching" || row.status === "done") {
    const dot = row.result?.difficulty_ranking ? DIFF_DOT[row.result.difficulty_ranking] : null;
    return (
      <div className="flex items-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono text-zinc-100">
          {row.status === "researching" && <Loader2 className="h-3 w-3 animate-spin text-emerald-300" />}
          {row.status === "done" && (dot
            ? <span className={`h-2 w-2 rounded-full ${dot}`} title={row.result.difficulty_ranking} />
            : <span className="h-2 w-2 rounded-full bg-white/30" title="No difficulty found" />)}
          {row.raw}
        </span>
      </div>
    );
  }
  // Default input box — typing into it spawns the next one (handled upstream).
  return (
    <div className="flex items-center gap-2">
      <Input
        value={row.raw}
        onChange={(e) => onType(row.rid, e.target.value)}
        onKeyDown={(e) => { if (e.key === "Backspace" && row.raw === "") { e.preventDefault(); onRemove(row.rid); } }}
        placeholder="e.g. CSC 110"
        className="bg-black border-white/10 font-mono text-sm flex-1"
        aria-label="Course code"
      />
      {row.raw.trim() && (
        <button type="button" onClick={() => onRemove(row.rid)} className="text-white/40 hover:text-rose-300 p-1" title="Remove">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}