import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, TrendingUp, DollarSign, Target, Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isWithinInterval, parseISO } from "date-fns";
import { useCurrency } from "@/lib/currency-context";
import { AGENTS } from "@/lib/agentPrompts";

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    top_category: { type: "string" },
    top_category_amount: { type: "number" },
    top_category_pct: { type: "number" },
    points: {
      type: "array",
      items: {
        type: "object",
        properties: {
          icon: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["icon", "title", "detail"],
      },
    },
  },
  required: ["headline", "summary", "top_category", "top_category_amount", "top_category_pct", "points"],
};

const iconMap = {
  "trending-up": TrendingUp,
  "dollar": DollarSign,
  "target": Target,
  "check": CheckCircle2,
  "alert": AlertTriangle,
  "activity": Activity,
};

export default function SpendingInsights({ monthLabel, start, end, transactions }) {
  const { fmtMoney: fmt } = useCurrency();
  const storageKey = `dd:insights:${monthLabel}`;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  // Load cached feedback for this month on mount / month change.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setData(raw ? JSON.parse(raw) : null);
    } catch { setData(null); }
  }, [storageKey]);

  // Invalidate cache if this month's category totals change materially.
  const monthSpend = React.useMemo(() => {
    let total = 0;
    const cats = {};
    transactions.forEach((t) => {
      if (!t.date || t.type !== "expense") return;
      try {
        if (isWithinInterval(parseISO(t.date), { start, end })) {
          total += t.amount || 0;
          const c = t.category || "Uncategorized";
          cats[c] = (cats[c] || 0) + (t.amount || 0);
        }
      } catch {}
    });
    return { total, cats };
  }, [transactions, start, end]);

  async function generate() {
    setLoading(true);
    try {
      const catLines = Object.entries(monthSpend.cats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([k, v]) => `- ${k}: $${v.toFixed(2)}`)
        .join("\n");

      const prompt = `${AGENTS.SNO.systemPrompt}

Analyze this user's spending for the month of ${monthLabel} and give actionable, personalized feedback on their spending habits, the top categories they overspent on, and concrete suggestions to save.

Return JSON with: headline, summary (1-2 sentences), top_category (name), top_category_amount (number), top_category_pct (number 0-100 of total spend), and 3-5 points (icon in trending-up|dollar|target|alert|check|activity, title, detail). Be specific and reference real numbers and category names.

TOTAL SPEND THIS MONTH: $${monthSpend.total.toFixed(2)}
TOP CATEGORIES:
${catLines || "(no spending recorded)"}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: SCHEMA,
      });
      const parsed = typeof result === "string" ? JSON.parse(result) : (result?.response || result);
      setData(parsed);
      try { localStorage.setItem(storageKey, JSON.stringify(parsed)); } catch {}
    } catch {
      setData({
        headline: "Insights Unavailable",
        summary: "Couldn't generate AI feedback right now — try again in a moment.",
        top_category: "",
        top_category_amount: 0,
        top_category_pct: 0,
        points: [{ icon: "check", title: "Try again", detail: "AI was busy — give it another shot." }],
      });
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 flex items-center justify-center bg-violet-500/10">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-zinc-100">Sno · Monthly Diagnostic</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/50">{monthLabel} · spending audit</p>
          </div>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          size="sm"
          className="bg-violet-600 text-white hover:bg-violet-500"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Analyzing…" : data ? "Regenerate" : "Generate AI Feedback"}
        </Button>
      </div>

      {data && (
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-violet-300" />
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">{data.headline}</p>
          </div>
          <p className="text-xs text-zinc-300 mb-3 leading-relaxed">{data.summary}</p>

          {data.top_category && (
            <div className="rounded-lg border border-white/10 bg-zinc-950/40 p-3 mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/50">Top spend category</p>
                <p className="text-base font-semibold text-zinc-100">{data.top_category}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-rose-300 tabular-nums">{fmt(data.top_category_amount)}</p>
                {data.top_category_pct > 0 && (
                  <p className="text-[10px] text-zinc-500 tabular-nums">{Math.round(data.top_category_pct)}% of spend</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {data.points?.map((pt, i) => {
              const Icon = iconMap[pt.icon] || CheckCircle2;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3 w-3 text-violet-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-100">{pt.title}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{pt.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}