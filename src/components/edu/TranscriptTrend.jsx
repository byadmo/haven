import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";

// Historical GPA trend from the saved transcript. Renders nothing until the
// user has added a transcript to their profile, so it's safe to mount always.
export default function TranscriptTrend() {
  const { transcript } = useEduSync();
  if (!transcript || !transcript.terms || transcript.terms.length < 2) return null;

  const data = transcript.terms.map((t) => ({ term: t.term, gpa: t.gpa }));

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">
          Transcript GPA Trend · {transcript.totalCredits} credits
        </p>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="term" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} stroke="rgba(255,255,255,0.15)" />
            <YAxis domain={[0, 4]} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.5)" }} stroke="rgba(255,255,255,0.15)" />
            <Tooltip contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#fff" }} formatter={(v) => [Number(v).toFixed(2), "GPA"]} />
            <Line type="monotone" dataKey="gpa" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}