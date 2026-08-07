import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPlus, Loader2, X, CalendarDays } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { lookupCachedCourses, researchCourse, bestGuessTitle } from "@/lib/courseAutofill";
import { useDebounce } from "@/hooks/useDebounce";
import SemesterSelect from "@/components/edu/SemesterSelect";

const DIFF_DOT = {
  Easy: "bg-emerald-400",
  Moderate: "bg-lime-400",
  Hard: "bg-amber-400",
  "Very Hard": "bg-orange-400",
  Brutal: "bg-rose-500",
};

// Each row owns a uniquely-incremented id so React re-renders stay stable
// across spawn-on-commit.
let _rid = 0;
const nextRid = () => ++_rid;

// Quick Add Courses. Each row is its own input box. As the user types, a
// university-catalog autocomplete dropdown appears (autocompleteCourses).
// Selecting a result — or pressing Enter on a typed code — commits that
// row: the input morphs into an in-row pill, a fresh empty input appears
// underneath for the next course, and the course is saved + AI-researched
// (description + difficulty) in the background. As research lands, the pill
// gains a colored dot matching the discovered difficulty.
export default function QuickAddCourses({ open, onOpenChange, semesterId }) {
  const { settings, semesters, createSemester } = useEduSync();
  const [rowIds, setRowIds] = React.useState(() => [nextRid()]);
  const [selectedSemesterId, setSelectedSemesterId] = React.useState(semesterId || "");

  React.useEffect(() => {
    if (open) {
      setRowIds([nextRid()]);
      setSelectedSemesterId(semesterId || semesters[0]?.id || "");
    }
  }, [open, semesterId, semesters]);

  function spawnNext() {
    setRowIds((ids) => [...ids, nextRid()]);
  }

  const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);
  const canAdd = !!selectedSemesterId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-2xl w-[92vw]">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-emerald-400" /> Quick Add
            {selectedSemester && (
              <span className="text-emerald-300 text-sm font-normal">— {selectedSemester.term_label}</span>
            )}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Pick a semester, then type each course code — pick from the dropdown or press Enter. Each commit saves the course and AI-researches its description + difficulty in the background; a new empty box appears underneath for the next one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Semester selection — the FIRST box in the Quick Add flow. */}
          <div>
            <Label className="text-white/50 flex items-center gap-1.5 mb-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-300/70" /> Select Semester
            </Label>
            <SemesterSelect
              semesters={semesters}
              value={selectedSemesterId}
              onSelect={setSelectedSemesterId}
              createSemester={createSemester}
            />
          </div>

          {canAdd ? (
            <div className="space-y-1.5">
              <Label className="text-white/50">Course codes — adding to {selectedSemester?.term_label}</Label>
              <div className="flex flex-col gap-1.5">
                {rowIds.map((rid) => (
                  <Row key={rid} settings={settings} semesterId={selectedSemesterId} onCommit={spawnNext} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-white/40">Create or pick a semester above to start adding courses.</p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ settings, semesterId, onCommit }) {
  const { createCourse, updateCourse, deleteCourse, setAiResearching } = useEduSync();
  const { toast } = useToast();

  const [raw, setRaw] = React.useState("");
  const debouncedRaw = useDebounce(raw, 300);
  const [suggestions, setSuggestions] = React.useState([]);
  const [sugLoading, setSugLoading] = React.useState(false);
  const [showSug, setShowSug] = React.useState(false);

  // phase: input | saving | researching | done | error
  const [phase, setPhase] = React.useState("input");
  const [committed, setCommitted] = React.useState({ code: "", title: "" });
  const [courseId, setCourseId] = React.useState(null);
  const [difficulty, setDifficulty] = React.useState("");

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

  React.useEffect(() => {
    let cancelled = false;
    if (phase !== "input") return;
    const q = (debouncedRaw || "").trim();
    if (q.length < 2) { setSuggestions([]); setSugLoading(false); return; }
    setSugLoading(true);
    lookupCachedCourses({ query: q, university: uniObj, profile: profileObj })
      .then((out) => { if (!cancelled) setSuggestions(Array.isArray(out?.courses) ? out.courses : []); })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setSugLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedRaw, phase, uniObj, profileObj]);

  async function commit(candidate) {
    const c = (candidate?.code || "").trim().toUpperCase();
    if (c.length < 2 || phase !== "input") return;
    if (!semesterId) {
      toast({ title: "No active semester", description: "Create a semester first.", variant: "destructive" });
      return;
    }
    const title = (candidate?.title || "").trim() || bestGuessTitle(c) || c;
    const credits = typeof candidate?.credits === "number" && candidate.credits > 0 ? candidate.credits : 3;
    const weeklyHours = typeof candidate?.estimated_weekly_hours === "number" && candidate.estimated_weekly_hours > 0 ? candidate.estimated_weekly_hours : 6;
    setCommitted({ code: c, title });
    setShowSug(false);
    setSuggestions([]);
    setPhase("saving");
    // Spawn a fresh input box underneath for the next course.
    onCommit();
    let savedId = null;
    try {
      const created = await createCourse({
        course: {
          code: c,
          title,
          semester_id: semesterId,
          credits,
          target_weekly_hours: weeklyHours,
          university_name: settings?.university_name || null,
          faculty: candidate?.faculty || settings?.faculty || "",
          degree_program: candidate?.degree_program || settings?.degree_program || "",
          specialization: candidate?.specialization || settings?.specialization || "",
          course_description: candidate?.description || "",
          prerequisites: candidate?.prerequisites || "",
          difficulty_ranking: candidate?.difficulty_ranking || "",
          difficulty_reason: candidate?.difficulty_reason || "",
        },
        deliverables: [],
        materials: [],
      });
      savedId = created?.id;
      if (!savedId) throw new Error("no course id");
      setCourseId(savedId);
      setAiResearching(savedId, true);
      setPhase("researching");
      let out = null;
      try { out = await researchCourse({ code: c, title: title || "", university: uniObj, profile: profileObj }); }
      catch { out = null; }
      if (out) {
        const patch = {};
        if (out.description?.trim()) patch.course_description = out.description.trim();
        if (out.prerequisites?.trim()) patch.prerequisites = out.prerequisites.trim();
        if (out.difficulty_ranking) patch.difficulty_ranking = out.difficulty_ranking;
        if (out.difficulty_reason) patch.difficulty_reason = out.difficulty_reason;
        if (Object.keys(patch).length) await updateCourse(savedId, patch);
        setDifficulty(out.difficulty_ranking || "");
      }
      setPhase("done");
    } catch (e) {
      setPhase("error");
      toast({ title: `Could not save ${c}`, description: "Try again in a moment.", variant: "destructive" });
    } finally {
      if (savedId) setAiResearching(savedId, false);
    }
  }

  function onKeyDown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const first = suggestions[0];
    const candidate = first || { code: raw.trim().toUpperCase(), title: "" };
    if ((candidate.code || "").length >= 2) commit(candidate);
  }

  async function removePill() {
    // Best-effort delete of the saved course, then revert the row to an editable input.
    if (courseId) { try { await deleteCourse(courseId); } catch {} }
    setPhase("input");
    setCommitted({ code: "", title: "" });
    setCourseId(null);
    setDifficulty("");
    setRaw("");
  }

  if (phase === "input") {
    return (
      <div className="relative">
        <Input
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setShowSug(true); }}
          onKeyDown={onKeyDown}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 150)}
          placeholder="e.g. CSC 110"
          className="bg-black border-white/10 font-mono text-sm"
          aria-label="Course code"
        />
        {showSug && (sugLoading || suggestions.length > 0) && (
          <div className="relative z-20 mt-1 max-h-40 overflow-y-auto rounded-md border border-white/10 bg-black shadow-lg">
            {sugLoading && (
              <div className="px-3 py-2 text-[10px] text-white/40 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Searching catalog…
              </div>
            )}
            {suggestions.map((s, i) => (
              <button
                key={(s.code || "") + i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); commit(s); }}
                className="w-full text-left px-3 py-2 hover:bg-emerald-500/10 flex flex-col gap-0.5 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-100">{s.code}</span>
                  {s.difficulty_ranking && (
                    <span className={`h-2 w-2 rounded-full ${DIFF_DOT[s.difficulty_ranking] || "bg-white/30"}`} title={s.difficulty_ranking} />
                  )}
                </div>
                <span className="text-[10px] text-white/50 line-clamp-1 pr-6">{s.title || "—"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // phase: saving | researching | done | error → in-row pill.
  const dot =
    phase === "done" && difficulty ? DIFF_DOT[difficulty]
    : phase === "error" ? "bg-rose-500"
    : null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono text-zinc-100 max-w-full">
      <span className="flex items-center gap-1.5 min-w-0">
        {phase === "saving" && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-emerald-300" />}
        {phase === "researching" && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-emerald-300" />}
        {phase === "done" && (dot ? <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} title={difficulty} /> : <span className="h-2 w-2 shrink-0 rounded-full bg-white/30" />)}
        {phase === "error" && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" title="Save failed" />}
        <span className="text-zinc-100 shrink-0">{committed.code}</span>
        {committed.title && committed.title !== committed.code && (
          <span className="text-white/50 font-sans text-[11px] truncate">— {committed.title}</span>
        )}
      </span>
      <button
        type="button"
        onClick={removePill}
        onTouchStart={(e) => { e.preventDefault(); removePill(); }}
        className="text-white/40 hover:text-rose-300 p-0.5 -mr-1 shrink-0"
        title={phase === "error" ? "Discard" : "Remove"}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}