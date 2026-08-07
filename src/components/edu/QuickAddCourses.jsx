import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ListPlus, Loader2, Sparkles } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { researchCourse } from "@/lib/courseAutofill";

// Quick Add: paste a list of course codes (comma-, newline- or semicolon-
// separated). On submit, each course is created immediately with an empty
// shape; then a detached AI research task runs in the background per course
// to fill in description, prerequisites and difficulty, writing the result
// back via updateCourse. While running, CourseCard shows its existing
// "AI researching…" badge (driven by setAiResearching in eduSyncContext).
export default function QuickAddCourses({ open, onOpenChange, semesterId }) {
  const { createCourse, updateCourse, setAiResearching, settings } = useEduSync();
  const { toast } = useToast();
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) { setInput(""); setBusy(false); }
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

  function parseCodes() {
    return Array.from(new Set(
      input
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2 && /^[A-Za-z]/.test(s))
    ));
  }

  async function handleAdd() {
    if (!semesterId) {
      toast({ title: "No active semester", description: "Create a semester in the dashboard first.", variant: "destructive" });
      return;
    }
    const codes = parseCodes();
    if (!codes.length) {
      toast({ title: "No course codes detected", description: "Use commas or one-per-line.", variant: "destructive" });
      return;
    }
    setBusy(true);
    let created = 0;
    // Save each course, then kick off a detached research task so the modal
    // can close immediately and the rows fill in as AI results land.
    for (const code of codes) {
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
            } catch (e) {
              // Silent — best-effort enrichment.
            } finally {
              setAiResearching(c.id, false);
            }
          })();
        }
      } catch (e) {
        // Skip a single failed create, keep going with the rest.
      }
    }
    setBusy(false);
    if (created > 0) {
      toast({ title: `Added ${created} course${created === 1 ? "" : "s"}`, description: "AI is researching description & difficulty in the background." });
      onOpenChange(false);
    } else {
      toast({ title: "Could not add courses", description: "Try again in a moment.", variant: "destructive" });
    }
  }

  const detected = input.trim() ? parseCodes() : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <ListPlus className="h-4 w-4 text-emerald-400" /> Quick Add Courses
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Paste multiple course codes (comma- or newline-separated). Each is saved immediately and researched by AI in the background.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label className="text-white/50">Course codes</Label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            className="bg-black border-white/10 mt-1 font-mono text-sm"
            placeholder={"e.g.\nCSC 110\nCSC 290\nMATH 137, STAT 230"}
          />
          {detected.length > 0 && (
            <p className="text-[10px] text-white/40 mt-1">
              Detected {detected.length} course{detected.length === 1 ? "" : "s"} · each is saved and researched separately.
            </p>
          )}
        </div>
        <DialogFooter className="pt-2">
          <DialogClose asChild><Button type="button" variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Cancel</Button></DialogClose>
          <Button type="button" onClick={handleAdd} disabled={busy} className="bg-emerald-500 text-black hover:bg-emerald-400">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Sparkles className="h-4 w-4" /> Add &amp; Research</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}