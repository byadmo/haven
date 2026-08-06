import React, { useState, useRef } from "react";
import { Sparkles, Send, Loader2, Trash2, ChevronDown, ChevronUp, GraduationCap, Clock, Target, BookOpen, AlertTriangle, CalendarDays, BarChart3 } from "lucide-react";
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

function buildContext(ctx) {
  const { activeSemester, courses, deliverables, focuses, weeklyMinutes, streak, cumulativeGpa, settings } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const courseSummary = courses.map((c) => ({
    code: c.code, title: c.title, credits: c.credits,
    target_weekly_hours: c.target_weekly_hours, studied_hours: c.studiedHours,
    progress: c.progress,
    deliverables: (c.deliverables || []).map((d) => ({
      title: d.title, type: d.type, status: d.status, due: d.due_date, weight: d.weight,
      grade: d.grade, completed: d.completed, is_exam: d.is_exam,
    })),
    next: c.next ? { title: c.next.title, due: c.next.due_date } : null,
  }));
  const upcoming = deliverables.filter((d) => !d.completed && (d.due_date || "") >= today).map((d) => ({
    title: d.title, due: d.due_date, type: d.type, is_exam: d.is_exam,
  }));
  const plannedFocuses = (focuses || []).filter((f) => f.status === "planned").map((f) => {
    const c = courses.find((x) => x.id === f.course_id);
    return { title: f.title, course: c ? c.code : "Free", target: f.target_date, duration: f.suggested_duration, priority: f.priority };
  });
  const materialsByCourse = ctx.materialsByCourse || {};
  const coursesWithMaterials = courseSummary.map((c) => ({
    ...c,
    materials: (materialsByCourse[c.id] || []).map((m) => ({ title: m.title, required: m.required, cost: m.estimated_cost })),
  }));
  return {
    semester: activeSemester ? { label: activeSemester.term_label, start: activeSemester.start_date, end: activeSemester.end_date } : null,
    courses: coursesWithMaterials,
    upcoming_deliverables: upcoming,
    planned_focuses: plannedFocuses,
    study_this_week_minutes: weeklyMinutes,
    streak_days: streak.current,
    cumulative_gpa: cumulativeGpa,
    scholarship_threshold_gpa: settings?.scholarship_threshold_gpa ?? null,
  };
}

function suggestFor(messages, ctx, scope) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const picker = (ctx.courses || [])[0];
  if (!last) {
    if (scope === "courses") {
      return [
        picker ? `What materials do I need for ${picker.code}?` : "What materials do I need?",
        "Which course has the most assignments?",
        picker ? `Show my grading breakdown for ${picker.code}` : "Show my grading breakdown",
        "What's my heaviest course this week?",
      ];
    }
    return [
      "What should I focus on today?",
      "Show my upcoming deadlines",
      picker ? `How am I doing in ${picker.code}?` : "How is my semester going?",
      "What's my study streak?",
    ];
  }
  const q = (last.text || "").toLowerCase();
  const has = (s) => q.includes(s);
  if (["deadline", "due", "coming", "upcoming", "next", "schedule", "focus", "priorit"].some(has)) {
    return [
      "Create a study plan for my next exam",
      "Which course needs the most attention?",
      "How many hours have I studied this week?",
      "What should I focus on today?",
    ];
  }
  if (["grade", "gpa", "score", "mark", "scholarship", "standing", "final"].some(has)) {
    return [
      "What do I need on the final?",
      "Am I above scholarship threshold?",
      "Which course is at risk?",
      "How can I improve my GPA?",
    ];
  }
  const courseCodes = (ctx.courses || []).map((c) => (c.code || "").toLowerCase()).filter(Boolean);
  if (courseCodes.some((code) => q.includes(code))) {
    return [
      "What are the grading weights?",
      "When is the next assignment due?",
      "Suggest study topics for this course",
      "How many hours have I studied for this?",
    ];
  }
  return [
    "What should I focus on today?",
    "Show my upcoming deadlines",
    picker ? `How am I doing in ${picker.code}?` : "How is my semester going?",
    "What's my study streak?",
  ];
}

function AssistantCard({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-lg bg-emerald-500/15 border border-emerald-400/20 px-3 py-2 text-xs text-zinc-50">
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
            <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                <p className="text-[11px] font-semibold text-zinc-50">{s.title}</p>
              </div>
              <ul className="space-y-0.5 pl-5">
                {(s.bullets || []).map((b, j) => (
                  <li key={j} className="text-[11px] text-white/70 leading-snug list-disc">{b}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">{msg.text}</div>
  );
}

export default function EduAssistant({ scope }) {
  const ctx = useEduSync();
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const suggestions = React.useMemo(() => suggestFor(messages, ctx, scope), [messages, ctx.courses, ctx.focuses, ctx.deliverables, ctx.weeklyMinutes, ctx.streak, ctx.cumulativeGpa, scope]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  async function send(text) {
    const q = (text || "").trim();
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
      const prompt = `You are EduSync AI, an academic assistant for a university student. Analyze the student's current semester data and answer their question. Be specific, actionable, concise, and use the real data provided. Return 1-4 sections as JSON.

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

  function clearChat() { setMessages([]); }

  if (collapsed) {
    return (
      <div className="rounded-lg border border-white/10 bg-black">
        <button onClick={() => setCollapsed(false)} className="w-full flex items-center gap-2 p-3 text-left">
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <p className="text-sm font-semibold text-zinc-50 flex-1">EduSync AI</p>
          <ChevronUp className="h-4 w-4 text-white/40" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black flex flex-col lg:sticky lg:top-20 max-h-[58vh] lg:max-h-[460px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        <Sparkles className="h-4 w-4 text-emerald-300 shrink-0" />
        <p className="text-sm font-semibold text-zinc-50 flex-1">EduSync AI</p>
        <button onClick={clearChat} disabled={!messages.length} className="text-white/40 hover:text-rose-300 disabled:opacity-30 p-1" title="Clear chat"><Trash2 className="h-3.5 w-3.5" /></button>
        <button onClick={() => setCollapsed(true)} className="text-white/40 hover:text-white/70 p-1" title="Minimize"><ChevronDown className="h-3.5 w-3.5" /></button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 min-h-[120px]">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <Sparkles className="h-7 w-7 text-emerald-300/40 mx-auto mb-1.5" />
            <p className="text-xs text-white/60">Ask anything about your semester — deadlines, grades, study time & focus.</p>
          </div>
        )}
        {messages.map((m, i) => <AssistantCard key={i} msg={m} />)}
        {loading && (
          <div className="flex items-center gap-2 text-white/50 text-[11px]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" /> Analyzing your semester data…
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="px-3 py-2 border-t border-white/10 flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask EduSync…"
          className="flex-1 bg-black border-white/10 h-8 text-xs"
          disabled={loading}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="bg-emerald-500 text-black hover:bg-emerald-400 h-8 w-8">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        </Button>
      </form>

      {/* Suggestions — always visible */}
      <div className="px-3 pb-2.5 pt-1.5 border-t border-white/10 flex flex-wrap gap-1.5 shrink-0">
        {suggestions.map((q) => (
          <button key={q} onClick={() => send(q)} className="text-[10.5px] px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] hover:bg-emerald-500/10 hover:border-emerald-400/30 text-white/70 transition-colors text-left">
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}