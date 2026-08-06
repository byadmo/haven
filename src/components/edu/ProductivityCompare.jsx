import React, { useMemo, useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEduSync } from "@/lib/eduSyncContext";

const FRAMES = [
  { key: 7, label: "Week" },
  { key: 14, label: "2 Weeks" },
  { key: 30, label: "Month" },
];

function rangeMetrics(sessions, deliverables, days) {
  const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - (days - 1));
  const inRange = (iso) => { const d = new Date(iso); return d >= cutoff; };
  const mins = sessions.filter((s) => inRange(s.completed_at)).reduce((a, s) => a + (s.duration_minutes || 0), 0);
  const tasksDone = deliverables.filter((d) => d.completed && d.due_date && inRange(d.due_date)).length;
  const sessionsCount = sessions.filter((s) => inRange(s.completed_at)).length;
  return { mins, sessions: sessionsCount, tasks: tasksDone };
}

// Compact dashboard card comparing productivity (last period vs current period)
// derived from StudySession + Deliverable data, with a short AI quote reacting
// to the trend.
export default function ProductivityCompare() {
  const { studySessions, deliverables } = useEduSync();
  const [days, setDays] = useState(7);
  const [quote, setQuote] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);

  const data = useMemo(() => {
    const current = rangeMetrics(studySessions, deliverables, days);
    // Recompute prev as the window immediately preceding `current`.
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const curStart = new Date(now); curStart.setDate(curStart.getDate() - (days - 1));
    const prevEnd = new Date(curStart); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (days - 1));
    const inPrev = (iso) => { const d = new Date(iso); return d >= prevStart && d <= prevEnd; };
    const pMins = studySessions.filter((s) => inPrev(s.completed_at)).reduce((a, s) => a + (s.duration_minutes || 0), 0);
    const pSessions = studySessions.filter((s) => inPrev(s.completed_at)).length;
    const pTasks = deliverables.filter((d) => d.completed && d.due_date && inPrev(d.due_date)).length;
    return {
      current,
      prev: { mins: pMins, sessions: pSessions, tasks: pTasks },
    };
  }, [studySessions, deliverables, days]);

  const chartData = [
    { name: "Focus mins", "Last period": data.prev.mins, "Current period": data.current.mins },
    { name: "Sessions", "Last period": data.prev.sessions, "Current period": data.current.sessions },
    { name: "Tasks done", "Last period": data.prev.tasks, "Current period": data.current.tasks },
  ];

  const trend = data.current.mins - data.prev.mins;
  const direction = trend > 0 ? "up" : trend < 0 ? "down" : "flat";

  useEffect(() => {
    let cancelled = false;
    setLoadingQuote(true);
    base44.integrations.Core.InvokeLLM({
      prompt: `A student's productivity over the current period vs the previous period: focus minutes went from ${data.prev.mins} to ${data.current.mins} (${direction}), study sessions from ${data.prev.sessions} to ${data.current.sessions}, completed tasks from ${data.prev.tasks} to ${data.current.tasks}. Write ONE short, single-sentence message directly to the student reacting to this trend. If productivity is up or steady-good, give a brief encouraging positive quote. If productivity is down or concerning, give a gentle motivating nudge. No emojis, no quotation marks, no period at the end. Keep it under 14 words.`,
      response_json_schema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
    }).then((res) => {
      const d = res?.data ?? res;
      if (!cancelled) setQuote((d?.message || "").replace(/^["']|["']$/g, "").replace(/\.$/, ""));
    }).catch(() => { if (!cancelled) setQuote(""); })
    .finally(() => { if (!cancelled) setLoadingQuote(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, data.current.mins, data.current.sessions, data.current.tasks, data.prev.mins, data.prev.sessions, data.prev.tasks, direction]);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-white/50">Productivity</p>
        <div className="flex items-center gap-0.5 rounded-md border border-white/10 p-0.5">
          {FRAMES.map((f) => (
            <button key={f.key} onClick={() => setDays(f.key)} className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${days === f.key ? "bg-emerald-500/15 text-emerald-300" : "text-white/50 hover:text-white"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* AI quote */}
      <div className={`rounded-md border px-3 py-2 mb-3 flex items-start gap-1.5 ${direction === "up" ? "border-emerald-400/30 bg-emerald-500/5" : direction === "down" ? "border-amber-400/30 bg-amber-500/5" : "border-white/10"}`}>
        <Sparkles className={`h-3 w-3 mt-0.5 shrink-0 ${direction === "up" ? "text-emerald-300" : direction === "down" ? "text-amber-300" : "text-white/50"}`} />
        {loadingQuote ? (
          <span className="flex items-center gap-1.5 text-[11px] text-white/40"><Loader2 className="h-3 w-3 animate-spin" /> Analyzing your trend…</span>
        ) : (
          <p className="text-[11px] text-zinc-200 italic leading-snug">{quote || "Add a study session to see your trend."}</p>
        )}
      </div>

      <div className="h-[132px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 9 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey="Last period" fill="rgba(255,255,255,0.25)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Current period" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-2 text-[10px] text-white/40">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-white/25" /> Last period</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Current period</span>
      </div>
    </div>
  );
}