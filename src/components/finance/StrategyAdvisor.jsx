import React from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Loader2, CheckCircle2, TrendingUp, DollarSign, Target,
  RefreshCw, Rocket, Activity, AlertTriangle, Wand2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AGENTS } from "@/lib/agentPrompts";

const STORAGE_KEY = "dd:strategy-advice-v1";

const iconMap = {
  "trending-up": TrendingUp,
  "dollar": DollarSign,
  "target": Target,
  "check": CheckCircle2,
  "alert": AlertTriangle,
  "activity": Activity,
};

function fmt(n) {
  return (n || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

// Build a rich context string covering recurring/scheduled payments,
// minimum payments, total debt, cash, and recent activity.
function buildContext({ debts, accounts, transactions, surplus }) {
  const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const totalMin = debts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
  const totalCash = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const active = debts.filter((d) => (d.current_balance || 0) > 0);
  const debtList = active
    .map((d) => `- ${d.name}: $${(d.current_balance || 0).toFixed(2)} at ${(d.interest_rate || 0)}% (${d.interest_type || "APR"}), min $${(d.minimum_payment || 0).toFixed(2)}/mo${d.due_date ? `, due ${d.due_date}` : ""}`)
    .join("\n");

  const highestAPR = active.length ? Math.max(...active.map((d) => d.interest_rate || 0)) : 0;
  const smallestBalance = active.length ? Math.min(...active.map((d) => d.current_balance || 0)) : 0;

  // Recurring + scheduled (one-time scheduled items count too).
  const recurring = transactions.filter((t) => t.is_scheduled || (t.frequency && t.frequency !== "one_time"));
  const recurringList = recurring.slice(0, 30)
    .map((t) => `- ${t.type === "income" ? "Income" : "Expense"}: ${t.description} $${(t.amount || 0).toFixed(2)} ${t.frequency || (t.is_scheduled ? "scheduled" : "one-time")}${t.next_date ? ` next ${t.next_date}` : ""}`)
    .join("\n");
  const recIn = recurring.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const recOut = recurring.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  // Recent 15 transactions for spending context.
  const recent = [...transactions]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 15)
    .map((t) => `- ${t.date} ${t.type === "income" ? "+" : "-"}$${(t.amount || 0).toFixed(2)} ${t.description} [${t.category || "uncategorized"}]`)
    .join("\n");

  return {
    text: `DEBTS:
${debtList || "(none)"}

HIGHEST APR: ${highestAPR}%, SMALLEST BALANCE: $${smallestBalance.toFixed(2)}
TOTAL DEBT: $${totalDebt.toFixed(2)}, TOTAL MINIMUM PAYMENTS: $${totalMin.toFixed(2)}/mo
CASH ON HAND: $${totalCash.toFixed(2)}
CURRENT MONTHLY SURPLUS (income - expenses this month): $${surplus.toFixed(2)}/mo

RECURRING & SCHEDULED PAYMENTS (summarized):
Income (recurring): $${recIn.toFixed(2)}/mo
Expenses (recurring): $${recOut.toFixed(2)}/mo
${recurringList || "(none)"}

RECENT ACTIVITY (last 15):
${recent || "(none)"}`,
    totalDebt, totalMin, totalCash,
  };
}

const ADVICE_SCHEMA = {
  type: "object",
  properties: {
    heading: { type: "string" },
    method: { type: "string", enum: ["avalanche", "snowball"] },
    recommended_surplus: { type: "number", description: "Monthly surplus the user should commit to debt payoff in USD" },
    recommended_target_months: { type: "number", description: "Suggested payoff horizon in months" },
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
  required: ["heading", "method", "recommended_surplus", "recommended_target_months", "points"],
};

const UPDATE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "Short status verdict e.g. 'You're on track' or 'Reduce spending'" },
    summary: { type: "string", description: "One or two sentence assessment" },
    on_track: { type: "boolean" },
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
    adjusted_surplus: { type: "number", description: "Optional revised monthly surplus, if spending should change" },
  },
  required: ["headline", "summary", "points"],
};

export default function StrategyAdvisor({ debts, accounts, transactions, surplus, onApplyRecommendations }) {
  const [state, setState] = React.useState(null); // { advice, update, applied, savedAt }
  const [loading, setLoading] = React.useState(null); // 'generate' | 'update' | null
  const [applied, setApplied] = React.useState(false);

  // Load persisted advice on mount.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState(parsed);
        setApplied(!!parsed.applied);
      }
    } catch {}
  }, []);

  function persist(next) {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  async function runLlm(prompt, schema) {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
    });
    return typeof result === "string" ? JSON.parse(result) : (result?.response || result);
  }

  async function generateAdvice() {
    setLoading("generate");
    try {
      const ctx = buildContext({ debts, accounts, transactions, surplus });
      const prompt = `${AGENTS.OPI.systemPrompt}

Analyze the user's debt and cash-flow situation and give actionable, specific recommendations.

Return JSON with: heading, method (avalanche or snowball), recommended_surplus (number, USD/mo to commit), recommended_target_months (number), and 4-6 points (each with icon in trending-up|dollar|target|alert|check|activity, title, detail).

Account for:
- Recurring + scheduled payments already listed — only Recommend surplus AFTER those obligations
- Total minimum payments must always be covered first
- Which strategy (Avalanche vs Snowball) fits and why
- Specific debt name + dollar amount to direct extra money
- Income/expense adjustments to increase contribution
- A specific milestone or goal
- One quick win they can act on today

${ctx.text}`;
      const data = await runLlm(prompt, ADVICE_SCHEMA);
      persist({ advice: data, update: null, applied: false, savedAt: Date.now() });
      setApplied(false);
    } catch {
      persist({
        advice: {
          heading: "Advisor Unavailable",
          method: "avalanche",
          recommended_surplus: surplus || 0,
          recommended_target_months: 0,
          points: [{ icon: "check", title: "Try again", detail: "Couldn't generate recommendations right now — try again in a moment." }],
        },
        update: null, applied: false, savedAt: Date.now(),
      });
    }
    setLoading(null);
  }

  async function generateUpdate() {
    setLoading("update");
    try {
      const ctx = buildContext({ debts, accounts, transactions, surplus });
      const lastAdvice = state?.advice;
      const lastAdviceText = lastAdvice
        ? `Previous recommendations (heading: ${lastAdvice.heading}, method: ${lastAdvice.method}, recommended surplus: $${(lastAdvice.recommended_surplus || 0).toFixed(2)}/mo, target months: ${lastAdvice.recommended_target_months}, points: ${JSON.stringify(lastAdvice.points)}):`
        : "(no previous recommendations)";

      const prompt = `${AGENTS.OPI.systemPrompt}

You are giving a PROGRESS UPDATE. Compare the user's current state to their last advice and produce a concise update.

Return JSON with: headline (short verdict), summary (1-2 sentences), on_track (boolean), 2-4 points (icon in trending-up|dollar|target|alert|check|activity, title, detail). Each point should be specific: am I doing well, should I reduce spending, should I allocate more to a specific debt (name + dollar), etc. Optionally include adjusted_surplus (number, USD/mo) if you think the monthly surplus should change.

${lastAdviceText}

CURRENT STATE:
${ctx.text}`;
      const data = await runLlm(prompt, UPDATE_SCHEMA);
      persist({ ...state, update: data, savedAt: Date.now() });
    } catch {
      persist({
        ...state,
        update: {
          headline: "Update Unavailable",
          summary: "Couldn't generate an update right now — try again in a moment.",
          on_track: true,
          points: [{ icon: "check", title: "Try again", detail: "AI was busy — give it another shot." }],
        },
        savedAt: Date.now(),
      });
    }
    setLoading(null);
  }

  function applyToEngine() {
    const adv = state?.advice;
    if (!adv || onApplyRecommendations == null) return;
    onApplyRecommendations({
      surplus: adv.recommended_surplus || 0,
      method: adv.method || "avalanche",
      months: adv.recommended_target_months || null,
    });
    setApplied(true);
    persist({ ...state, applied: true });
  }

  const advice = state?.advice;
  const update = state?.update;
  const hasAdvice = !!advice;

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 flex items-center justify-center bg-violet-500/10">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">Opi · Debt Strategy Advisor</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Tactical debt analyst · accelerate your payoff</p>
        </div>
      </div>

      {/* First-run button */}
      {!hasAdvice && (
        <Button
          onClick={generateAdvice}
          disabled={loading != null}
          variant="outline"
          className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 gap-2 w-full sm:w-auto"
        >
          {loading === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading === "generate" ? "Analyzing your debts..." : "Get AI Recommendations"}
        </Button>
      )}

      {/* Action buttons once advice exists */}
      {hasAdvice && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            onClick={generateAdvice}
            disabled={loading != null}
            size="sm"
            variant="outline"
            className="border-violet-500/40 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200"
          >
            {loading === "generate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Regenerate
          </Button>
          <Button
            onClick={generateUpdate}
            disabled={loading != null}
            size="sm"
            variant="outline"
            className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            {loading === "update" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
            Update
          </Button>
          <Button
            onClick={applyToEngine}
            disabled={loading != null}
            size="sm"
            className="bg-indigo-600 text-white hover:bg-indigo-500"
          >
            <Rocket className="h-3.5 w-3.5" />
            {applied ? "Applied ✓ — Re-apply" : "Apply to Engine"}
          </Button>
        </div>
      )}

      {/* Advice panel */}
      {hasAdvice && (
        <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">{advice.heading}</p>
            <span className="text-[10px] text-zinc-500">
              Method: <span className="text-violet-300">{advice.method}</span>
              {" · "}Target: <span className="text-violet-300">{advice.recommended_target_months || "—"} mo</span>
              {" · "}Surplus: <span className="text-violet-300">{fmt(advice.recommended_surplus)}/mo</span>
            </span>
          </div>
          <div className="space-y-3">
            {advice.points?.map((pt, i) => {
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

      {/* Update panel */}
      {update && (
        <div className="mt-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-6 w-6 rounded-md flex items-center justify-center ${update.on_track ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
              {update.on_track ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />}
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">{update.headline}</p>
          </div>
          <p className="text-xs text-zinc-300 mb-3 leading-relaxed">{update.summary}</p>
          <div className="space-y-2.5">
            {update.points?.map((pt, i) => {
              const Icon = iconMap[pt.icon] || CheckCircle2;
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3 w-3 text-emerald-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-100">{pt.title}</p>
                    <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{pt.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {update.adjusted_surplus != null && Math.abs(update.adjusted_surplus - (advice?.recommended_surplus || 0)) > 0.01 && (
            <button
              onClick={() => {
                if (onApplyRecommendations) {
                  onApplyRecommendations({ surplus: update.adjusted_surplus, method: advice?.method || "avalanche", months: advice?.recommended_target_months || null });
                  setApplied(true);
                  persist({ ...state, applied: true });
                }
              }}
              className="mt-3 text-[11px] uppercase tracking-widest text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 rounded-md px-2.5 py-1.5"
            >
              <Wand2 className="h-3 w-3 inline mr-1" />Apply new surplus {fmt(update.adjusted_surplus)}/mo to Engine
            </button>
          )}
        </div>
      )}
    </div>
  );
}