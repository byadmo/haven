import React from "react";
import { base44 } from "@/api/base44Client";
import { FileText, ExternalLink, Sparkles, Loader2, Trash2 } from "lucide-react";
import FileDropzone from "@/components/edu/FileDropzone";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

// Course outline manager shown inside the course detail dialog. Attaches a
// course outline file, lets the user view it online anytime, summarizes it
// with AI, and removes it. The attached file is also readable by EduSync AI.
export default function CourseOutline({ course }) {
  const { updateCourse } = useEduSync();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [summarizing, setSummarizing] = React.useState(false);
  const [summary, setSummary] = React.useState(null);

  async function attach(files) {
    const f = files?.[0];
    if (!f || !course?.id) return;
    setBusy(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file: f });
      const url = up?.data?.file_url || up?.file_url;
      await updateCourse(course.id, { outline_file_url: url, outline_file_name: f.name });
      toast({ title: "Outline attached" });
    } catch (e) {
      toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try {
      await updateCourse(course.id, { outline_file_url: "", outline_file_name: "" });
      setSummary(null);
      toast({ title: "Outline removed" });
    } catch (e) {
      toast({ title: "Remove failed", variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function summarize() {
    if (!course?.outline_file_url || summarizing) return;
    setSummarizing(true);
    setSummary(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Read this course outline for ${course.code || ""} ${course.title || ""}. Summarize the most important information and what a student needs to study. Include: grading breakdown, key deliverables and due dates, topics covered, course policies, exam info, and a concise "what to study" list. Be structured and concise.`,
        file_urls: [course.outline_file_url],
      });
      const txt = res?.data ?? res;
      setSummary(typeof txt === "string" ? txt : "");
    } catch (e) {
      toast({ title: "Summary failed", description: e?.message, variant: "destructive" });
    } finally { setSummarizing(false); }
  }

  return (
    <div className="rounded-lg border border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Course outline</p>
        {course?.outline_file_url && (
          <div className="flex items-center gap-2">
            <button onClick={summarize} disabled={summarizing} className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80 hover:text-emerald-200 disabled:opacity-50 transition-all duration-200 ease-out" title="Summarize the outline with AI">
              {summarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {summarizing ? "Summarizing…" : "Summarize"}
            </button>
            <button onClick={remove} disabled={busy} className="text-white/40 hover:text-rose-300 disabled:opacity-50 transition-all duration-200 ease-out" title="Remove outline"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      {course?.outline_file_url ? (
        <div className="space-y-2">
          <a href={course.outline_file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-white/10 hover:border-emerald-400/30 px-3 py-2 transition-colors">
            <FileText className="h-4 w-4 text-emerald-300/70 shrink-0" />
            <span className="text-xs text-zinc-100 truncate flex-1 min-w-0">{course.outline_file_name || "Course outline"}</span>
            <ExternalLink className="h-3.5 w-3.5 text-white/40 shrink-0" />
          </a>
          {summary && (
            <div className="rounded-md border border-emerald-400/20 bg-emerald-500/5 p-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-300/70 mb-1">Outline summary</p>
              <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">{summary}</p>
            </div>
          )}
        </div>
      ) : (
        <FileDropzone hint="Attach this course's outline (PDF / image / any file)" onFiles={attach} busy={busy} />
      )}
    </div>
  );
}