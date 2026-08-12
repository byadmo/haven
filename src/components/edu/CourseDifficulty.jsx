// Inline difficulty ranking badge + expandable "Learn More" panel for a course.
// Shows the short reason (difficulty_reason) next to a green/yellow/red dot.
// The Learn More expansion shows difficulty_details (cached on the Course);
// generated on demand via AI (gemini_3_flash + web search) and persisted back
// to the course so it doesn't regenerate.
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { generateDifficultyDetails } from "@/lib/courseAutofill";

const RANK = {
  Easy: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "border-emerald-400/30 bg-emerald-500/10", label: "See what students say", blurb: "Straightforward concepts, manageable workload. Most students handle this well." },
  Moderate: { dot: "bg-lime-400", text: "text-lime-300", ring: "border-lime-400/30 bg-lime-500/10", label: "See what students say", blurb: "Requires consistent effort. Some topics may need extra study time." },
  Hard: { dot: "bg-amber-400", text: "text-amber-300", ring: "border-amber-400/30 bg-amber-500/10", label: "Why is this hard? Learn more", blurb: "Known as a challenging course. Heavy workload and complex concepts. Plan your schedule accordingly." },
  "Very Hard": { dot: "bg-orange-400", text: "text-orange-300", ring: "border-orange-400/30 bg-orange-500/10", label: "Why is this so demanding? Learn more", blurb: "Notoriously demanding. Heavy lab/design load, deep prerequisites, high fail/drop rate." },
  Brutal: { dot: "bg-rose-500", text: "text-rose-300", ring: "border-rose-500/30 bg-rose-500/10", label: "Why is this brutal? Learn more", blurb: "One of the hardest courses in the program. Very high workload and high fail rate — plan everything around it." },
};

export default function CourseDifficulty({ course }) {
  const { updateCourse, settings } = useEduSync();
  const { toast } = useToast();
  // Briefing already persisted on the course entity (difficulty_details), so
  // it stays expanded on revisit / new session — "hard-coded" into the course.
  const [open, setOpen] = React.useState(!!cached);
  const [loading, setLoading] = React.useState(false);

  const rank = course.difficulty_ranking || "Moderate";
  const r = RANK[rank] || RANK.Moderate;
  const reason = course.difficulty_reason || r.blurb;
  const cached = course.difficulty_details;

  async function loadDetails() {
    if (cached) { setOpen((o) => !o); return; }
    if (loading) return;
    setLoading(true);
    try {
      const out = await generateDifficultyDetails({
        code: course.code,
        title: course.title,
        course_description: course.course_description,
        credits: course.credits,
        university: {
          university_name: course.university_name || settings?.university_name,
          university_domain: settings?.university_domain,
          university_course_catalog_url: settings?.university_course_catalog_url,
        },
      });
      if (out?.details) {
        const patch = { difficulty_details: out.details };
        if (out.weekly_hours != null && (!course.target_weekly_hours || course.target_weekly_hours === 6)) {
          patch.target_weekly_hours = out.weekly_hours;
        }
        await updateCourse(course.id, patch);
        setOpen(true);
      } else {
        toast({ title: "Couldn't generate details", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Couldn't generate details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded border ${r.ring} ${r.text} font-medium`}>
          <span className={`h-2 w-2 rounded-full ${r.dot}`} />
          {rank}
        </span>
        <p className="text-[10px] text-white/45 leading-snug flex-1 min-w-0">{reason}</p>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); loadDetails(); }}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80 hover:text-emerald-200 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {loading ? "Generating…" : cached ? (open ? "Hide details" : r.label) : r.label}
        {cached && !loading && <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>

      <AnimatePresence initial={false}>
        {open && cached && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-md border border-white/10 bg-black/40 p-2.5 mt-1">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-300" /> AI difficulty briefing
              </p>
              <div className="space-y-1.5">
                {cached.split("\n").filter((p) => p.trim()).map((p, i) => (
                  <p key={i} className="text-[11px] text-white/70 leading-relaxed">{p.trim()}</p>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}