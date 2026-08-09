import React from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Loader2, ShieldAlert, Activity, Target, TrendingUp, DollarSign, CheckCircle2, AlertTriangle, ArrowRightLeft,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AGENTS } from "@/lib/agentPrompts";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
const fmtPct = (v) => `${(v || 0).toFixed(1)}%`;

const ACTION_STYLES = {
  Hold: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  Trim: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  Liquidate: "text-rose-300 bg-rose-500/10 border-rose-500/30",
  Buy: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  Add: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  Watch: "text-zinc-300 bg-zinc-500/10 border-zinc-500/30",
};

const RISK_STYLES = {
  Safe: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  Moderate: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  Aggressive: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  Speculative: "text-rose-300 bg-rose-500/10 border-rose-500/30",
};

const iconMap = {
  "trending-up": TrendingUp,
  "dollar": DollarSign,
  "target": Target,
  "check": CheckCircle2,
  "alert": AlertTriangle,
  "activity": Activity,
};

const JUE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "One-line overall portfolio verdict" },
    risk_call: { type: "string", description: "Overall risk posture label e.g. 'Balanced', 'Concentrated', 'Aggressive'" },
    holdings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          account: { type: "string" },
          action: { type: "string", enum: ["Hold", "Trim", "Liquidate", "Buy", "Watch", "Add"] },
          weight_pct: { type: "number", description: "Percent of total portfolio value" },
          risk_tier: { type: "string", enum: ["Safe", "Moderate", "Aggressive", "Speculative"] },
          thesis: { type: "string", description: "One concise sentence reasoning" },
        },
        required: ["symbol", "action", "risk_tier", "thesis"],
      },
    },
    placement: {
      type: "array",
      description: "Account placement guidance",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" } },
        required: ["title", "detail"],
      },
    },
    priorities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          icon: { type: "string", enum: ["trending-up", "dollar", "target", "alert", "check", "activity"] },
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["icon", "title", "detail"],
      },
    },
  },
  required: ["headline", "risk_call", "holdings", "placement", "priorities"],
};

// Jue — Portfolio Manager & Stock Analyst. "Ask Jue" runs a structured audit
// of the user's holdings and renders a clean, neat verdict + holdings table.
export default function StockAdvisor({ stocks, prices }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const { name, title, badgeColor } = AGENTS.JUE;

  async function run() {
    setLoading(true);
    try {
      const totalValue = stocks.reduce(
        (sum, x) => sum + (typeof prices?.[x.symbol] === "number" ? prices[x.symbol] * (x.shares || 0) : 0),
        0
      );
      const lines = stocks.map((s) => {
        const price = prices?.[s.symbol];
        const has = typeof price === "number";
        const value = has ? price * (s.shares || 0) : 0;
        const cost = (s.avg_buy_price || 0) * (s.shares || 0);
        const pnl = has ? value - cost : 0;
        const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
        return `- ${s.symbol} | ${s.shares} sh | avg $${(s.avg_buy_price || 0).toFixed(2)} | acct ${s.account || "Non-Registered"} | weight ${weight.toFixed(1)}% | ${has ? `now $${price.toFixed(2)} · value $${value.toFixed(2)} · P&L ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}` : "no live price"}`;
      }).join("\n");

      const prompt = `${AGENTS.JUE.systemPrompt}

Audit the user's current portfolio and return a structured JSON assessment. For each holding issue an action (Hold/Trim/Liquidate/Buy/Watch/Add), its risk tier (Safe/Moderate/Aggressive/Speculative), its portfolio weight, and a one-sentence thesis with concrete numbers. Use bullet points with emojis (🚀, 📈, 🛡️, 💎) in each thesis. Apply the Holistic Risk Cap and TFSA-first account placement rules. Keep placement and priorities specific (tickers + dollars).

PORTFOLIO:
${lines || "(no holdings)"}

Total market value: ${fmt(totalValue)}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: JUE_SCHEMA,
      });
      const parsed = typeof result === "string" ? JSON.parse(result) : result?.response || result;
      if (!parsed?.holdings) throw new Error("bad shape");
      setData(parsed);
    } catch {
      setData({
        headline: "Audit Unavailable",
        risk_call: "—",
        holdings: [],
        placement: [],
        priorities: [{ icon: "check", title: "Try again", detail: "Couldn't run the portfolio audit right now — give it another shot." }],
      });
    }
    setLoading(false);
  }

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-7 w-7 flex items-center justify-center border ${badgeColor}`}>
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-zinc-100">{name} · {title}</h2>
            <p className="text-[10px] uppercase tracking-widest text-white/50">AI portfolio audit &amp; risk call</p>
          </div>
        </div>
        <Button
          onClick={run}
          disabled={loading || !stocks?.length}
          size="sm"
          className="bg-purple-600 text-white hover:bg-purple-500"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Analyzing…" : data ? "Ask Jue Again" : "Ask Jue"}
        </Button>
      </div>

      {loading && !data && (
        <p className="text-xs text-zinc-500 mt-3">Jue is auditing your holdings…</p>
      )}

      {data && (
        <div className="mt-4 space-y-4">
          {/* Verdict banner */}
          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">{data.headline}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mt-1">Overall posture</p>
                <p className="text-sm text-zinc-100 mt-0.5">{data.risk_call}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-200">
                <ShieldAlert className="h-3.5 w-3.5" /> Risk-conscious
              </span>
            </div>
          </div>

          {/* Holdings table */}
          {data.holdings?.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-zinc-950/40 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                <div className="col-span-3">Holding</div>
                <div className="col-span-2">Account</div>
                <div className="col-span-2 text-right">Weight</div>
                <div className="col-span-2">Action</div>
                <div className="col-span-3">Risk</div>
              </div>
              <div className="divide-y divide-white/5">
                {data.holdings.map((h, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2.5 items-start">
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{h.symbol}</p>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{h.thesis}</p>
                    </div>
                    <div className="col-span-2 text-[11px] text-zinc-300 truncate">{h.account || "—"}</div>
                    <div className="col-span-2 text-right text-xs tabular-nums text-zinc-200">{fmtPct(h.weight_pct)}</div>
                    <div className="col-span-2">
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${ACTION_STYLES[h.action] || ACTION_STYLES.Watch}`}>{h.action}</span>
                    </div>
                    <div className="col-span-3">
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${RISK_STYLES[h.risk_tier] || RISK_STYLES.Moderate}`}>{h.risk_tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account placement */}
          {data.placement?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2 flex items-center gap-1.5">
                <ArrowRightLeft className="h-3 w-3" /> Account placement
              </p>
              <div className="space-y-2">
                {data.placement.map((p, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="h-3 w-3 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{p.title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-0.5">{p.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Priorities */}
          {data.priorities?.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Prioritized actions</p>
              <div className="space-y-2.5">
                {data.priorities.map((pt, i) => {
                  const Icon = iconMap[pt.icon] || CheckCircle2;
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="h-5 w-5 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-3 w-3 text-purple-300" />
                      </div>
                      <div>
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
      )}
    </div>
  );
}