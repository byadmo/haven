import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Stethoscope } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, format } from "date-fns";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { AGENTS } from "@/lib/agentPrompts";
import { buildInsightPrompt } from "@/lib/promptBuilder";
import { checkRateLimit, recordCall } from "@/lib/rateLimiter";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

// Styled markdown renderer for Sno's diagnostic output.
const SNO_COMPONENTS = {
  h1: ({ node, ...p }) => <h3 className="text-xs font-semibold text-white tracking-tight mb-2 first:mt-0" {...p} />,
  h2: ({ node, ...p }) => <h3 className="text-xs font-semibold text-white tracking-tight mt-3 mb-2 first:mt-0" {...p} />,
  h3: ({ node, ...p }) => <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mt-3 mb-1.5 first:mt-0" {...p} />,
  h4: ({ node, ...p }) => <h4 className="text-[11px] font-semibold uppercase tracking-wider text-white/60 mt-2.5 mb-1.5 first:mt-0" {...p} />,
  p: ({ node, ...p }) => <p className="text-xs text-zinc-200 leading-relaxed my-1.5 first:my-0" {...p} />,
  ul: ({ node, ...p }) => <ul className="list-disc pl-4 space-y-1 my-2 first:my-0 marker:text-sky-500/60" {...p} />,
  ol: ({ node, ...p }) => <ol className="list-decimal pl-4 space-y-1 my-2 first:my-0 marker:text-sky-500/60" {...p} />,
  li: ({ node, ...p }) => <li className="text-xs text-zinc-200 leading-relaxed" {...p} />,
  strong: ({ node, ...p }) => <strong className="font-semibold text-white" {...p} />,
  em: ({ node, ...p }) => <em className="text-white/80" {...p} />,
  hr: ({ node, ...p }) => <hr className="border-white/10 my-3" {...p} />,
  code: ({ node, ...p }) => <code className="tnum text-emerald-300 bg-white/5 px-1 py-0.5 rounded text-[10px]" {...p} />,
  blockquote: ({ node, ...p }) => <blockquote className="border-l-2 border-sky-500/40 pl-3 text-white/60 italic my-2" {...p} />,
};

function SnoMarkdown({ children }) {
  return (
    <div className="sno-md first:mt-0">
      <ReactMarkdown components={SNO_COMPONENTS}>{String(children)}</ReactMarkdown>
    </div>
  );
}

// Build a tight, month-scoped data block for Sno to diagnose.
function buildMonthContext(anchor, transactions, accounts) {
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const inMonth = (d) => {
    try {
      return isWithinInterval(parseISO(d), { start, end });
    } catch {
      return false;
    }
  };
  const txns = transactions || [];

  const inc = txns.filter((t) => t.type === "income" && inMonth(t.date)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const exp = txns.filter((t) => t.type === "expense" && inMonth(t.date)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);

  const cats = {};
  txns.forEach((t) => {
    if (t.type === "expense" && inMonth(t.date)) {
      const k = t.category || "uncategorized";
      cats[k] = (cats[k] || 0) + Math.abs(t.amount || 0);
    }
  });
  const topCats = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => `- ${k}: ${fmt(v)}`)
    .join("\n");

  const topExp = txns
    .filter((t) => t.type === "expense" && inMonth(t.date))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 8)
    .map((t) => `- ${fmt(t.amount)} · ${t.description || ""}${t.category ? ` (${t.category})` : ""}`)
    .join("\n");

  const p = subMonths(anchor, 1);
  const pin = (d) => {
    try {
      return isWithinInterval(parseISO(d), { start: startOfMonth(p), end: endOfMonth(p) });
    } catch {
      return false;
    }
  };
  const pInc = txns.filter((t) => t.type === "income" && pin(t.date)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
  const pExp = txns.filter((t) => t.type === "expense" && pin(t.date)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);

  const starting = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
  const txnCount = txns.filter((t) => inMonth(t.date)).length;

  return [
    `MONTH UNDER REVIEW: ${format(anchor, "MMMM yyyy")}`,
    `- Starting cash balance: ${fmt(starting)}`,
    `- Transactions logged in month: ${txnCount}`,
    `- Income: ${fmt(inc)}`,
    `- Outflow: ${fmt(exp)}`,
    `- Net: ${fmt(inc - exp)}`,
    inc > 0 ? `- Savings rate: ${(((inc - exp) / inc) * 100).toFixed(0)}%` : "- Savings rate: n/a",
    "",
    "SPENDING BY CATEGORY (this month):",
    topCats || "- (none)",
    "",
    "TOP EXPENSES (this month):",
    topExp || "- (none)",
    "",
    `- Last month (${format(p, "MMMM yyyy")}): income ${fmt(pInc)} · outflow ${fmt(pExp)}`,
  ].join("\n");
}

// Sno — monthly diagnostic AI. Generates insights for the calendar's
// selected month on demand.
export default function CashFlowSnoInsights({ anchor }) {
  const { transactions, accounts } = useFinanceData();
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const monthLabel = format(anchor, "MMMM yyyy");

  const ctx = useMemo(
    () => buildMonthContext(anchor, transactions, accounts),
    [anchor, transactions, accounts]
  );

  // Clear stale output whenever the selected month changes.
  useEffect(() => {
    setOut("");
    setErr(false);
  }, [anchor]);

  async function generate() {
    setBusy(true);
    setErr(false);
    setOut("");
    try {
      const rl = checkRateLimit("Ask Sno for monthly diagnostic");
      if (!rl.ok) {
        setOut(`⛔ ${rl.reason}`);
        setBusy(false);
        return;
      }

      const taskDirective = `Provide a tight monthly diagnostic for ${monthLabel}. Format as bullet points with emojis (🔎, 📈, 📉, 💡, ⚡). Lead with headline numbers (income, outflow, net, savings rate), then period-over-period vs last month, then savings leaks (non-essential categories that blew past baseline, with exact figures), then a prioritized action plan. Keep it skimmable, no walls of text, no legal advice.`;

      const prompt = buildInsightPrompt({
        agent: AGENTS.SNO,
        sectionName: "CashFlow",
        contextBlock: ctx,
        taskDirective,
      });

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      recordCall("Ask Sno for monthly diagnostic");
      setOut(typeof res === "string" ? res : JSON.stringify(res));
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 grid place-items-center rounded-md border border-sky-500/30 bg-sky-500/10 shrink-0">
            <Stethoscope className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[11px] uppercase tracking-widest text-white/50">Sno · Monthly Diagnostic</h2>
            <p className="text-[11px] text-white/40 mt-0.5 truncate">AI insights for {monthLabel}</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {busy ? "Analyzing…" : "Analyze month"}
        </button>
      </div>

      {busy && !out ? (
        <div className="flex items-center gap-2 text-xs text-white/40 py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sno is reading your {monthLabel} data…
        </div>
      ) : err ? (
        <p className="text-xs text-rose-400 py-3">Couldn't generate insights — try again.</p>
      ) : out ? (
        out.startsWith("⛔") ? (
          <p className="text-xs text-amber-400 py-3">{out}</p>
        ) : (
          <SnoMarkdown>{out}</SnoMarkdown>
        )
      ) : (
        <p className="text-xs text-white/40 py-3">Click "Analyze month" for Sno's diagnostic on {monthLabel}.</p>
      )}
    </div>
  );
}