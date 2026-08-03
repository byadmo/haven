import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, CheckCircle2, TrendingUp, DollarSign, Target } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function StrategyAdvisor({ debts, accounts, transactions, surplus }) {
  const [tips, setTips] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  async function generateAdvice() {
    setLoading(true);
    setTips(null);
    try {
      const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
      const totalMin = debts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
      const totalCash = accounts.reduce((s, a) => s + (a.balance || 0), 0);

      const recurring = transactions.filter((t) => t.is_scheduled || (t.frequency && t.frequency !== "one_time"));
      const recIn = recurring.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const recOut = recurring.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

      const debtList = debts
        .filter((d) => (d.current_balance || 0) > 0)
        .map((d) => `${d.name}: $${(d.current_balance || 0).toFixed(2)} at ${(d.interest_rate || 0)}% (${d.interest_type || "APR"}), min $${(d.minimum_payment || 0).toFixed(2)}/mo`);

      const highestAPR = debts.filter(d => (d.current_balance || 0) > 0).length
        ? Math.max(...debts.filter(d => (d.current_balance || 0) > 0).map(d => d.interest_rate || 0))
        : 0;
      const smallestBalance = debts.filter(d => (d.current_balance || 0) > 0).length
        ? Math.min(...debts.filter(d => (d.current_balance || 0) > 0).map(d => d.current_balance || 0))
        : 0;

      const prompt = `You are a sharp financial advisor. Analyze the user's debt situation and give actionable recommendations in bullet points.

Return a JSON object with this exact structure:
{
  "heading": "a short 3-5 word title for the advice",
  "points": [
    { "icon": "trending-up|dollar|target|check", "title": "short bold headline", "detail": "one clear sentence explaining what to do and why" }
  ]
}

Provide 4-6 bullet points covering:
- Which strategy to use (Avalanche vs Snowball) and why
- Where to direct extra money (specific debt name + dollar amount)
- Income or expense adjustments to increase contribution
- A specific milestone or goal to aim for
- One quick win they can act on today

User's debts:
${debtList.join("\n")}

Highest APR: ${highestAPR}%, Smallest balance: $${smallestBalance.toFixed(2)}
Total debt: $${totalDebt.toFixed(2)}, Min payments: $${totalMin.toFixed(2)}/mo
Monthly recurring income: $${recIn.toFixed(2)}, Monthly recurring expenses: $${recOut.toFixed(2)}
Monthly surplus available: $${surplus.toFixed(2)}/mo
Cash on hand: $${totalCash.toFixed(2)}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            heading: { type: "string" },
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
          required: ["heading", "points"],
        },
      });

      const data = typeof result === "string" ? JSON.parse(result) : result?.response || result;
      setTips(data);
    } catch (e) {
      setTips({
        heading: "Advisor Unavailable",
        points: [{ icon: "check", title: "Try again", detail: "Couldn't generate recommendations right now — try again in a moment." }],
      });
    }
    setLoading(false);
  }

  const iconMap = {
    "trending-up": TrendingUp,
    "dollar": DollarSign,
    "target": Target,
    "check": CheckCircle2,
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 flex items-center justify-center bg-violet-500/10">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">AI Strategy Advisor</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Personalized recommendations to accelerate your payoff</p>
        </div>
      </div>

      <Button
        onClick={generateAdvice}
        disabled={loading}
        variant="outline"
        className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 gap-2 w-full sm:w-auto"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analyzing your debts..." : "Get AI Recommendations"}
      </Button>

      {tips && (
        <div className="mt-4 p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300 mb-3">{tips.heading}</p>
          <div className="space-y-3">
            {tips.points?.map((pt, i) => {
              const Icon = iconMap[pt.icon] || CheckCircle2;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-violet-300" />
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