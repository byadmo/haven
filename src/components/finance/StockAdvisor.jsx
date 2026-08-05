import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { AGENTS } from "@/lib/agentPrompts";

const fmt = (v) => (v || 0).toFixed(2);

// Jue — Portfolio Manager & Stock Analyst. Renders an "Ask Jue" action that
// audits the user's holdings and returns a prioritized risk/position call.
export default function StockAdvisor({ stocks, prices }) {
  const [out, setOut] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { name, title, badgeColor } = AGENTS.JUE;

  async function run() {
    setLoading(true);
    setOut("");
    try {
      const lines = stocks.map((s) => {
        const price = prices?.[s.symbol];
        const has = typeof price === "number";
        const value = has ? price * (s.shares || 0) : 0;
        const cost = (s.avg_buy_price || 0) * (s.shares || 0);
        const pnl = has ? value - cost : 0;
        return `- ${s.symbol} | ${s.shares} sh | avg $${fmt(s.avg_buy_price)} | acct ${s.account || "Non-Registered"} | ${has ? `now $${fmt(price)} · value $${fmt(value)} · P&L ${pnl >= 0 ? "+" : ""}$${fmt(pnl)}` : "no live price"}`;
      }).join("\n");
      const totalValue = stocks.reduce(
        (sum, x) =>
          sum + (typeof prices?.[x.symbol] === "number" ? prices[x.symbol] * (x.shares || 0) : 0),
        0
      );
      const prompt = `${AGENTS.JUE.systemPrompt}\n\nAudit the user's portfolio below and give a concise, prioritized assessment: an overall risk call, per-position action (Hold/Trim/Liquidate/Buy) with reasoning, and account-placement guidance. Be specific with tickers and numbers.\n\nPORTFOLIO:\n${lines || "(no holdings)"}\n\nTotal market value: $${fmt(totalValue)}`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setOut(typeof res === "string" ? res : res?.response || res?.text || JSON.stringify(res));
    } catch {
      setOut("Couldn't generate a portfolio review right now — try again in a moment.");
    }
    setLoading(false);
  }

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-black p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
          {loading ? "Analyzing…" : "Ask Jue"}
        </Button>
      </div>
      {out && (
        <div className="mt-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
          <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{out}</p>
        </div>
      )}
    </div>
  );
}