import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Activity, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AGENTS } from "@/lib/agentPrompts";
import { buildInsightPrompt } from "@/lib/promptBuilder";
import { checkRateLimit, recordCall } from "@/lib/rateLimiter";

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    on_track: { type: "boolean" },
    directives: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" } },
        required: ["title", "detail"],
      },
    },
    cutbacks: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, amount: { type: "number" } },
        required: ["name", "amount"],
      },
    },
  },
  required: ["headline", "summary", "directives"],
};

// Clu — Income & Expense Balancer. "Ask Clu" reviews the user's timeframe
// budget and issues hard dollar-amount directives and cutbacks.
export default function BudgetAdvisor({ timeframe, timeframeLabel, bills, incomeTotal, spendingTotal, leftover, fmt }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const { name, title, badgeColor } = AGENTS.CLU;

  async function run() {
    setLoading(true);
    try {
      const ctx = `BUDGET TIMEFRAME: ${timeframeLabel} (${timeframe})
INCOME (this timeframe): ${fmt(incomeTotal)}
BILLS (this timeframe):
${bills.map((b) => `- ${b.name}: ${fmt(b.amount)}`).join("\n") || "(none)"}
TOTAL SPENDING (this timeframe): ${fmt(spendingTotal)}
LEFTOVER (this timeframe): ${fmt(leftover)}`;

      const rl = checkRateLimit("Ask Clu for budget analysis");
      if (!rl.ok) {
        setData({
          headline: "Rate limited",
          summary: rl.reason,
          on_track: leftover >= 0,
          directives: [],
          cutbacks: [],
        });
        setLoading(false);
        return;
      }

      const prompt = buildInsightPrompt({
        agent: AGENTS.CLU,
        sectionName: "Budgeting",
        contextBlock: ctx,
        taskDirective: `Review the user's ${timeframeLabel} budget below. Use the Trailing 3-Month Minimum Income concept if income looks variable. Issue hard dollar-amount directives for transfers, buffers, or debt, and name exact cutbacks per bill category. Use bullet points with emojis (⚡, 📊, 🎯, 💰) in each insight. Return JSON only.`,
      });

      const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA });
      recordCall("Ask Clu for budget analysis");
      const d = typeof res === "string" ? JSON.parse(res) : res?.response || res;
      setData(d);
    } catch {
      setData({
        headline: "Unavailable",
        summary: "Couldn't generate Clu's analysis right now — try again in a moment.",
        on_track: leftover >= 0,
        directives: [],
        cutbacks: [],
      });
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-7 w-7 flex items-center justify-center border ${badgeColor}`}>
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-zinc-100">{name} · {title}</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Cash-flow directives for this budget</p>
          </div>
        </div>
        <Button onClick={run} disabled={loading} size="sm" className="bg-amber-600 text-white hover:bg-amber-500">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Analyzing…" : data ? "Ask Clu Again" : "Ask Clu"}
        </Button>
      </div>

      {data && (
        <div className="mt-4 space-y-4">
          <div className={`p-4 rounded-xl border ${data.on_track !== false ? "border-amber-500/20 bg-amber-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
            <div className="flex items-center gap-2 mb-1.5">
              {data.on_track !== false
                ? <Activity className="h-4 w-4 text-amber-300" />
                : <AlertTriangle className="h-4 w-4 text-rose-300" />}
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">{data.headline}</p>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{data.summary}</p>
          </div>

          {data.directives?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Directives</p>
              <div className="space-y-2.5">
                {data.directives.map((d, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="h-3 w-3 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{d.title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{d.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.cutbacks?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Suggested cutbacks</p>
              <div className="flex flex-wrap gap-2">
                {data.cutbacks.map((c, i) => (
                  <span key={i} className="text-[11px] px-2 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200">
                    {c.name}: <span className="tabular-nums font-semibold">{fmt(c.amount)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}