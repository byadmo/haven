import React from "react";
import { Sparkles, Send, Loader2, GraduationCap, Clock, Target, BookOpen, AlertTriangle, CalendarDays, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useEduSync } from "@/lib/eduSyncContext";

const ICONS = {
  graduation: GraduationCap, clock: Clock, target: Target, book: BookOpen,
  alert: AlertTriangle, calendar: CalendarDays, chart: BarChart3,
};

const SCHEMA = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          icon: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["title", "bullets"],
      },
    },
  },
  required: ["sections"],
};

const QUICK = [
  "What's coming up this week?",
  "Am I on track with my study hours?",
  "What needs more attention?",
  "How's my grade standing?",
];

function buildContext(ctx) {
  const { activeSemester, courses, deliverables, weeklyMinutes, streak, cumulativeGpa } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const courseSummary = courses.map((c) => ({
    code: c.code, title: c.title, credits: c.credits,
    target_weekly_hours: c.target_weekly_hours, studied_hours: c.studiedHours,
    progress: c.progress,
    deliverables: (c.deliverables || []).map((d) => ({
      title: d.title, type: d.type, due: d.due_date, weight: d.weight,
      grade: d.grade, completed: d.completed, is_exam: d.is_exam,
    })),
    next: c.next ? { title: c.next.title, due: c.next.due_date } : null,
  }));
  const upcoming = deliverables.filter((d) => !d.completed && (d.due_date || "") >= today).map((d) => ({
    title: d.title, due: d.due_date, type: d.type, is_exam: d.is_exam,
  }));
  return {
    semester: activeSemester ? { label: activeSemester.term_label, start: activeSemester.start_date, end: activeSemester.end_date } : null,
    courses: courseSummary,
    upcoming_deliverables: upcoming,
    study_this_week_minutes: weeklyMinutes,
    streak_days: streak.current,
    cumulative_gpa: cumulativeGpa,
  };
}

function AssistantCard({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-emerald-500/15 border border-emerald-400/20 px-3 py-2 text-sm text-zinc-50">
          {msg.text}
        </div>
      </div>
    );
  }
  if (msg.sections && msg.sections.length) {
    return (
      <div className="space-y-2">
        {msg.sections.map((s, i) => {
          const Icon = ICONS[s.icon] || GraduationCap;
          return (
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                <p className="text-xs font-semibold text-zinc-50">{s.title}</p>
              </div>
              <ul className="space-y-1 pl-5">
                {(s.bullets || []).map((b, j) => (
                  <li key={j} className="text-[12px] text-white/70 leading-snug list-disc">{b}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-200">{msg.text}</div>
  );
}

export default function EduAssistant() {
  const ctx = useEduSync();
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(text) {
    const q = text.trim();
    if (!q || loading) return;
    const userMsg = { role: "user", text: q };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const ctxData = buildContext(ctx);
      const priorQA = history.slice(0, -1).map((m) =>
        m.role === "user"
          ? `Q: ${m.text}`
          : `A: ${(m.sections || []).map((s) => `${s.title}: ${(s.bullets || []).join("; ")}`).join(" | ")}`
      ).join("\n");
      const prompt = `You are EduSync AI, an academic assistant for a university student. Analyze the student's current semester data and answer their question. Be specific, actionable, and concise. Return 1-4 sections as JSON.

CURRENT SEMESTER DATA (JSON):
${JSON.stringify(ctxData, null, 2)}
${priorQA ? `\nPREVIOUS CONVERSATION:\n${priorQA}\n` : ""}
QUESTION: ${q}

Return JSON: { "sections": [ { "title": string, "icon": one of graduation|clock|target|book|alert|calendar|chart, "bullets": [short single-sentence strings] } ] }`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
      const data = res?.data ?? res;
      const sections = data?.sections || [];
      setMessages([...history, { role: "assistant", sections }]);
    } catch (e) {
      setMessages([...history, { role: "assistant", text: `Sorry, I couldn't generate a response right now. (${e.message || "error"})` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full group rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] hover:bg-emerald-500/10 transition-colors p-4 flex items-center gap-3 text-left"
      >
        <div className="h-10 w-10 grid place-items-center rounded-lg bg-emerald-500/15 border border-emerald-400/30 shrink-0">
          <Sparkles className="h-5 w-5 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-50">Ask EduSync AI</p>
          <p className="text-[11px] text-white/50">Analyze your semester, study patterns, grades & deadlines</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-emerald-300/70 shrink-0">Open</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-black border-white/10 p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-white/10">
            <DialogTitle className="flex items-center gap-2 text-sm text-zinc-50">
              <Sparkles className="h-4 w-4 text-emerald-300" /> EduSync AI Assistant
            </DialogTitle>
            <DialogDescription className="text-[11px] text-white/50">
              Analyzes your active semester — courses, study time, grades & deadlines.
            </DialogDescription>
          </DialogHeader>

          <div ref={scrollRef} className="max-h-[55vh] overflow-y-auto px-4 py-4 space-y-3 min-h-[180px]">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Sparkles className="h-8 w-8 text-emerald-300/40 mx-auto mb-2" />
                <p className="text-sm text-white/60 mb-3">Ask anything about your semester.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)} className="text-[11px] px-2.5 py-1.5 rounded-md border border-white/10 bg-white/[0.03] hover:bg-emerald-500/10 hover:border-emerald-400/30 text-white/70 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => <AssistantCard key={i} msg={m} />)}
            {loading && (
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" /> Analyzing your semester data…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="px-4 py-3 border-t border-white/10 flex items-center gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your courses, grades, study time…"
              className="flex-1 bg-black border-white/10 h-9 text-sm"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="bg-emerald-500 text-black hover:bg-emerald-400 h-9 w-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}