import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Sparkles, Loader2, X, Trash2 } from "lucide-react";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, format, differenceInMonths } from "date-fns";
import { computeTrajectory, solveExtraForTarget } from "@/lib/trajectory";
import ApprovalModal from "@/components/assistant/ApprovalModal";
import { adjustLinkedBalance, txEffect, balanceApplies } from "@/lib/accounts";
import { AGENTS, AGENT_LIST } from "@/lib/agentPrompts";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { buildPrompt } from "@/lib/promptBuilder";
import { checkRateLimit, recordCall } from "@/lib/rateLimiter";

const uid = () => Math.random().toString(36).slice(2);

const fmtMoney = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

// Detect a target debt-free date the user mentions in plain language.
function parseTargetDate(text) {
  if (!text) return null;
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const m1 = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\b/i);
  if (m1) { const d = new Date(Number(m1[2]), months[m1[1].toLowerCase().slice(0, 3)], 1); if (!isNaN(d)) return d; }
  const m2 = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (m2) { const d = new Date(Number(m2[3]), Number(m2[1]) - 1, Number(m2[2])); if (!isNaN(d)) return d; }
  const m3 = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (m3) { const d = new Date(Number(m3[1]), Number(m3[2]) - 1, Number(m3[3])); if (!isNaN(d)) return d; }
  const m4 = text.match(/\b(20\d{2})\b/);
  if (m4) { const d = new Date(Number(m4[1]), 11, 1); if (!isNaN(d)) return d; }
  return null;
}

const STORAGE_KEY = "haven_assistant_chat_v1";

const GREETING = {
  id: uid(),
  role: "assistant",
  kind: "text",
  agentId: "WEI",
  text: "Hi — I'm Wei, your master financial strategist and the main entry point for Haven. Ask me anything about budgeting, debt, investing, taxes, or a big money decision. I collaborate with four specialists you can switch to anytime: Clu (cash flow & savings directives), Sno (monthly diagnostics), Jue (portfolio & stocks), and Opi (debt payoff strategy). I can also make changes to your transactions, debts, and accounts — you'll approve every edit first. Upload a statement to import, or tell me what's on your mind.",
};

const OPS_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
    operations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          entity: { type: "string", enum: ["Transaction", "Debt", "Account"] },
          action: { type: "string", enum: ["create", "update", "delete"] },
          targetId: { type: "string" },
          summary: { type: "string" },
          data: {
            type: "object",
            additionalProperties: true,
            properties: {
              description: { type: "string" },
              amount: { type: "number" },
              type: { type: "string", enum: ["income", "expense"] },
              category: { type: "string" },
              date: { type: "string" },
              account_id: { type: "string" },
              is_scheduled: { type: "boolean" },
              frequency: { type: "string", enum: ["one_time", "daily", "weekly", "biweekly", "monthly", "yearly", "custom"] },
              next_date: { type: "string" },
              custom_interval: { type: "number" },
              custom_unit: { type: "string", enum: ["days", "weeks", "months", "years"] },
              name: { type: "string" },
              current_balance: { type: "number" },
              original_balance: { type: "number" },
              interest_rate: { type: "number" },
              minimum_payment: { type: "number" },
              due_date: { type: "string" },
              status: { type: "string", enum: ["active", "paid_off"] },
              show_in_accounts: { type: "boolean" },
              balance: { type: "number" },
              accountType: { type: "string", enum: ["chequing", "savings"] },
              show_in_summary: { type: "boolean" },
            },
          },
        },
        required: ["id", "entity", "action", "summary"],
      },
    },
  },
  required: ["message", "operations"],
};

const SHARED_CAPABILITIES = `You are part of Haven's multi-agent financial advisory team. Your specialist role and behavior are defined above; everything below applies to ALL agents and describes the shared action layer. Always tailor your answer to the user's actual numbers in the PROVIDED DATA, reference their real accounts, debts, balances, and spending, and keep answers tight and skimmable: lead with the answer, then a short supporting explanation. Do not give legal or individual tax-filing advice or guarantees about investment returns — frame those as general educational guidance and suggest a licensed professional when it crosses that line.

ANALYTICS:
When the user asks for a review, insights, a "read" on their situation, or any open-ended question about their finances, synthesize across ALL provided data — net worth, cash balances, debts (balances, APRs, minimums), income, spending, portfolio holdings, recurring items, and payment history.
Produce concrete, numbers-grounded conclusions: cite the actual figures, point out trends and ratios (savings rate, debt-to-income, weighted APR, spending concentration), surface risks and opportunities, and end with a prioritized, specific action plan. Prefer depth and specificity over generic advice.

DEBT-FREE GOALS:
If a GOAL ANALYSIS block is present in the context, it contains the EXACT solver-computed extra monthly payment and projected debt-free date for the target date the user mentioned. Cite those figures verbatim, explain exactly what that payment buys them (months/interest saved vs minimums-only), and give a concrete plan to free up that amount monthly. Treat the GOAL ANALYSIS numbers as ground truth — do not recompute or round them differently.

CAPABILITIES:
You are action-capable: you can propose operations to add, remove, or change the user's Transaction, Debt, and Account records.
Only propose operations the user actually requested. For purely informational questions or advice, return operations: [] and answer in "message".
The user approves every change before it is applied.
If the user attached an image or PDF (provided via file_urls), review it and propose operations to log any transactions found, following any instructions in the user's message.

Entity fields:
- Transaction: description(string), amount(number, positive), type("income"|"expense"), category(string), date(yyyy-mm-dd), account_id(string), is_scheduled(bool), frequency("one_time"|"daily"|"weekly"|"biweekly"|"monthly"|"yearly"|"custom"), next_date(yyyy-mm-dd), custom_interval(number), custom_unit("days"|"weeks"|"months"|"years")
- Debt: name(string), current_balance(number), original_balance(number), interest_rate(number), minimum_payment(number), due_date(yyyy-mm-dd), status("active"|"paid_off"), show_in_accounts(bool)
- Account: name(string), balance(number), type("chequing"|"savings"), show_in_summary(bool)

For update or delete on existing records, set targetId to the record id shown in the PROVIDED DATA. Provide a short human-readable "summary" for each operation. Only include "data" for create/update with the fields to set.`;

function cleanData(data) {
  if (!data || typeof data !== "object") return {};
  const numeric = new Set(["amount", "current_balance", "original_balance", "interest_rate", "minimum_payment", "balance", "custom_interval", "shares", "avg_buy_price"]);
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = numeric.has(k) ? Number(v) : v;
  }
  return out;
}

function buildContext({ accounts, debts, transactions, debtPayments, stocks, categories, activeAgent, metrics }) {
  const money = (v) =>
    (v || 0).toLocaleString(undefined, {
      style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
    });
  const inMonth = (dateStr, ref) => {
    try {
      return isWithinInterval(parseISO(dateStr), { start: startOfMonth(ref), end: endOfMonth(ref) });
    } catch (_) {
      return false;
    }
  };

  const now = new Date();
  const accs = accounts || [];
  const dbs = debts || [];
  const txns = transactions || [];
  const pays = (debtPayments || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const stks = stocks || [];
  const cats = categories || [];

  // Single source of truth — every headline number comes from the
  // centralized FinanceDataContext analytics, so Wei/Clu/Sno/Jue/Opi/Elowen
  // read the exact same figures the UI renders.
  const m = metrics || {};
  const totalCash = m.totalCash ?? accs.reduce((s, a) => s + (a.balance || 0), 0);
  const totalDebt = m.totalDebt ?? dbs.reduce((s, d) => s + (d.current_balance || 0), 0);
  const portfolioCost = m.portfolioCostBasis ?? stks.reduce((s, x) => s + (x.shares || 0) * (x.avg_buy_price || 0), 0);
  const netWorth = m.netWorth ?? totalCash + portfolioCost - totalDebt;
  const totalMinPayments = m.totalMonthlyMinDebtPayments ?? dbs.reduce((s, d) => s + (d.minimum_payment || 0), 0);
  const weightedApr = m.weightedAverageApr ?? 0;
  const activeDebtCount = m.activeDebtCount ?? dbs.length;
  const paidDebt = m.paidOffDebtCount ?? dbs.filter((d) => d.status === "paid_off").length;
  const mIncome = m.currentMonthIncome ?? 0;
  const mExpense = m.currentMonthExpenses ?? 0;
  const savingsRate = m.savingsRate != null ? m.savingsRate / 100 : null;
  const debtToIncome = m.debtToIncomeRatio != null ? m.debtToIncomeRatio / 100 : null;
  const minIncomeBaseline = m.trailing3MonthMinIncome ?? 0;

  // 3-month cash-flow series (a time series, not a single metric — kept local).
  const monthIncome = (ref) => txns.filter((t) => t.type === "income" && inMonth(t.date, ref)).reduce((s, t) => s + (t.amount || 0), 0);
  const monthExpense = (ref) => txns.filter((t) => t.type === "expense" && inMonth(t.date, ref)).reduce((s, t) => s + (t.amount || 0), 0);
  const prev = subMonths(now, 1);
  const pIncome = monthIncome(prev);
  const pExpense = monthExpense(prev);
  const series = [];
  for (let i = 2; i >= 0; i--) {
    const r = subMonths(now, i);
    const inc = monthIncome(r);
    const exp = monthExpense(r);
    series.push(`- ${format(r, "MMM")} · in ${money(inc)} / out ${money(exp)} / net ${money(inc - exp)}`);
  }

  const topCats = (m.topSpendingCategories || [])
    .slice(0, 6)
    .map((c) => `- ${c.category}: ${money(c.amount)}`)
    .join("\n");

  const topExp = txns
    .filter((t) => t.type === "expense" && inMonth(t.date, now))
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 5)
    .map((t) => `- ${money(t.amount)} · ${t.description || ""}${t.category ? ` (${t.category})` : ""}`)
    .join("\n");

  const upcoming = txns
    .filter((t) => t.is_scheduled)
    .sort((a, b) => (a.next_date || a.date || "").localeCompare(b.next_date || b.date || ""))
    .slice(0, 8)
    .map((t) => `- ${t.next_date || t.date} | ${t.type} | ${money(t.amount)} | ${t.frequency || "recurring"} | "${t.description || ""}"`)
    .join("\n");

  const recurring = txns.filter((t) => t.is_scheduled);
  const recentPayments = pays.slice(0, 10).map((x) => `- ${x.date} | ${money(x.amount)} | debt ${x.debt_id}${x.note ? ` | "${x.note}"` : ""}`).join("\n");
  const lifetimePayments = pays.reduce((s, p) => s + (p.amount || 0), 0);

  const a = accs.map((x) => `- ${x.id} | "${x.name}" | balance ${x.balance ?? 0} | ${x.type || "chequing"}${x.show_in_summary === false ? " | hidden" : ""}`).join("\n");
  const d = dbs.map((x) => `- ${x.id} | "${x.name}" | balance ${x.current_balance ?? 0} | apr ${x.interest_rate ?? 0} | min ${x.minimum_payment ?? 0} | due ${x.due_date || ""} | ${x.status || "active"}`).join("\n");
  const pf = stks.map((x) => `- ${x.symbol} | "${x.name || ""}" | ${x.shares || 0} sh @ ${x.avg_buy_price || 0} | acct ${x.account || "Non-Registered"} | cost ${money((x.shares || 0) * (x.avg_buy_price || 0))}`).join("\n");
  const t = txns.slice(0, 40).map((x) => `- ${x.id} | ${x.date} | ${x.type} | ${x.category || ""} | ${x.amount} | acct ${x.account_id || "—"} | "${x.description || ""}"${x.is_scheduled ? ` | recurring ${x.frequency}` : ""}`).join("\n");
  const catList = cats.map((c) => `- ${c.name}`).join("\n");

  return [
    "PROVIDED DATA (ids are real — use them for update/delete targetId):",
    "",
    "=== ANALYTICS SNAPSHOT ===",
    `- Net worth: ${money(netWorth)}`,
    `- Total cash: ${money(totalCash)}`,
    `- Total debt / liabilities: ${money(totalDebt)}`,
    `- Portfolio cost basis: ${money(portfolioCost)}`,
    `- Active debts: ${activeDebtCount} · paid off: ${paidDebt}`,
    `- This month: income ${money(mIncome)} · expense ${money(mExpense)} · net ${money(mIncome - mExpense)}`,
    `- Last month: income ${money(pIncome)} · expense ${money(pExpense)}`,
    savingsRate !== null ? `- Savings rate (this month): ${(savingsRate * 100).toFixed(0)}%` : "- Savings rate: n/a",
    debtToIncome !== null ? `- Debt-to-income (min payments / income): ${(debtToIncome * 100).toFixed(0)}%` : "- Debt-to-income: n/a",
    `- Total monthly minimum debt payments: ${money(totalMinPayments)}`,
    `- Weighted avg APR: ${weightedApr.toFixed(2)}%`,
    `- Lifetime debt payments logged: ${money(lifetimePayments)}`,
    `- Recurring / scheduled items: ${recurring.length}`,
    "",
    "=== DYNAMIC AGENT BASELINES ===",
    `- Trailing 3-Month Minimum Income: ${money(minIncomeBaseline)}`,
    `- Active Agent Mode: ${activeAgent ? `${activeAgent.name} (${activeAgent.title})` : "Wei (Master Financial Strategist)"}`,
    "",
    "=== 3-MONTH CASH FLOW ===",
    ...series,
    "",
    "=== SPENDING BY CATEGORY (this month, top) ===",
    topCats || "- (none)",
    "",
    "=== TOP EXPENSES (this month) ===",
    topExp || "- (none)",
    "",
    "=== UPCOMING RECURRING / SCHEDULED ===",
    upcoming || "(none)",
    "",
    "=== ACCOUNTS ===",
    a || "(none)",
    "",
    "=== DEBTS ===",
    d || "(none)",
    "",
    "=== PORTFOLIO ===",
    pf || "(none)",
    "",
    "=== RECENT DEBT PAYMENTS ===",
    recentPayments || "(none)",
    "",
    "=== CUSTOM CATEGORIES ===",
    catList || "(none)",
    "",
    "=== RECENT TRANSACTIONS (latest 40) ===",
    t || "(none)",
  ].join("\n");
}

export default function AssistantChat({ accounts, debts, transactions, debtPayments, stocks, categories, summary }) {
  // Canonical metrics — the same numbers the rest of the UI renders.
  const {
    netWorth: ctxNetWorth,
    totalCash: ctxTotalCash,
    totalDebt: ctxTotalDebt,
    currentMonthIncome: ctxMonthIncome,
    currentMonthExpenses: ctxMonthExpenses,
    savingsRate: ctxSavingsRate,
    weightedAverageApr: ctxWeightedApr,
    activeDebtCount: ctxActiveDebtCount,
    paidOffDebtCount: ctxPaidOff,
    totalMonthlyMinDebtPayments: ctxMinPayments,
    debtToIncomeRatio: ctxDebtToIncome,
    trailing3MonthMinIncome: ctxTrailingMin,
    topSpendingCategories: ctxTopCats,
    portfolioCostBasis: ctxPortfolioCost,
    waterfallAllocations: ctxWaterfall,
  } = useFinanceData();

  const metrics = {
    netWorth: ctxNetWorth,
    totalCash: ctxTotalCash,
    totalDebt: ctxTotalDebt,
    portfolioCostBasis: ctxPortfolioCost,
    currentMonthIncome: ctxMonthIncome,
    currentMonthExpenses: ctxMonthExpenses,
    savingsRate: ctxSavingsRate,
    weightedAverageApr: ctxWeightedApr,
    activeDebtCount: ctxActiveDebtCount,
    paidOffDebtCount: ctxPaidOff,
    totalMonthlyMinDebtPayments: ctxMinPayments,
    debtToIncomeRatio: ctxDebtToIncome,
    trailing3MonthMinIncome: ctxTrailingMin,
    topSpendingCategories: ctxTopCats,
    waterfallAllocations: ctxWaterfall,
  };

  const [messages, setMessages] = React.useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) {}
    return [GREETING];
  });
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [ops, setOps] = React.useState(null);
  const [opsOpen, setOpsOpen] = React.useState(false);
  const [opsBusy, setOpsBusy] = React.useState(false);
  const [activeAgentKey, setActiveAgentKey] = React.useState("WEI");
  const activeAgent = AGENTS[activeAgentKey];
  const [pendingFile, setPendingFile] = React.useState(null);
  const [pendingPreview, setPendingPreview] = React.useState(null);
  const fileRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch (_) {}
  }, [messages]);

  // Mobile: track the visual viewport so the chat area resizes correctly
  // when the on-screen keyboard opens (avoids the input being covered/shifted).
  const [vpHeight, setVpHeight] = React.useState(null);
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVpHeight(vv.height);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const ctxData = { accounts, debts, transactions, debtPayments, stocks, categories, summary, metrics };

  function addMsg(m) { setMessages((s) => [...s, { id: uid(), ...m }]); }
  function opsFromResponse(obj) {
    return (obj?.operations || []).map((o) => ({ ...o, id: o.id || uid() }));
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    setPendingPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  function removePending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
    setPendingFile(null);
  }

  function handleClear() {
    if (!window.confirm("Clear this conversation? This cannot be undone.")) return;
    removePending();
    setMessages([GREETING]);
  }

  async function callLLM(prompt, fileUrls) {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: OPS_SCHEMA,
      ...(fileUrls && fileUrls.length ? { file_urls: fileUrls } : {}),
    });
    return typeof res === "string" ? JSON.parse(res) : res;
  }

  async function handleSend() {
    const text = input.trim();
    const file = pendingFile;
    if ((!text && !file) || busy) return;
    setInput("");
    const preview = pendingPreview;
    setPendingFile(null);
    setPendingPreview(null);

    const label = file
      ? (text ? `${text}  ·  📎 ${file.name}` : `📎 ${file.name}`)
      : text;
    addMsg({ role: "user", kind: file ? "file" : "text", text: label });

    const thinking = uid();
    addMsg({ role: "assistant", kind: "thinking", id: thinking });
    setBusy(true);
    try {
      let fileUrls;
      if (file) {
        const up = await base44.integrations.Core.UploadFile({ file });
        fileUrls = [up.file_url];
      }
      const userText = text || "Please review the attached statement and propose operations to log any transactions found.";

            // ---- Rate limit check ----
            const rl = checkRateLimit(userText);
            if (!rl.ok) {
              setMessages((s) => s.filter((m) => m.id !== thinking));
              addMsg({ role: "assistant", kind: "text", text: `⛔ ${rl.reason}` });
              setBusy(false);
              return;
            }

            let goalSection = "";
      const targetDate = parseTargetDate(userText);
      if (targetDate) {
        const activeDebts = (ctxData.debts || []).filter((d) => (d.current_balance || 0) > 0.005);
        if (activeDebts.length) {
          const targetMonths = Math.max(1, differenceInMonths(targetDate, new Date()));
          const horizon = Math.max(120, targetMonths + 3);
          const solved = solveExtraForTarget({
            debts: ctxData.debts, accounts: ctxData.accounts, transactions: ctxData.transactions,
            months: horizon, method: "avalanche", targetMonths,
          });
          let projMonth = null;
          if (solved.extra != null) {
            const { series } = computeTrajectory({
              debts: ctxData.debts, accounts: ctxData.accounts, transactions: ctxData.transactions,
              months: horizon, method: "avalanche", extraPayment: solved.extra,
            });
            const p = series.find((x) => x.debtRemaining <= 0.005);
            if (p) projMonth = p.date;
          }
          goalSection =
            "\n\nGOAL ANALYSIS (computed by the deterministic payoff solver — cite these EXACT figures):\n" +
            `- Target debt-free by: ${format(targetDate, "MMM d, yyyy")} (~${targetMonths} months from now)\n` +
            `- Required extra monthly payment above minimums: ${solved.extra != null ? `${fmtMoney(solved.extra)}/mo` : "not reachable within a reasonable range"}\n` +
            `- Reachable by target date: ${solved.reached ? "yes" : "no"}\n` +
            (projMonth ? `- With that payment, projected debt-free: ${format(projMonth, "MMM yyyy")}` : "- The target is not reachable at any practical monthly payment of $2,000 or more.");
        }
      }

      const prompt = buildPrompt({
              agent: activeAgent,
              sectionName: "Assistant",
              userMessage: userText,
              contextData: buildContext({ ...ctxData, activeAgent }),
              goalAnalysis: goalSection,
              sharedCapabilities: SHARED_CAPABILITIES,
            });
            const obj = await callLLM(prompt, fileUrls);
            recordCall(userText);
      setMessages((s) => s.filter((m) => m.id !== thinking));
      if (obj?.message) addMsg({ role: "assistant", kind: "text", text: obj.message, agentId: activeAgentKey });
      const opsList = opsFromResponse(obj);
      if (opsList.length) { setOps(opsList); setOpsOpen(true); }
      else if (!obj?.message) addMsg({ role: "assistant", kind: "text", text: "Done." });
    } catch (e) {
      setMessages((s) => s.filter((m) => m.id !== thinking));
      addMsg({ role: "assistant", kind: "text", text: "I had trouble responding just now — please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function executeOps(list) {
    setOpsBusy(true);
    const applied = [];
    const failed = [];
    try {
      for (const op of list) {
        const E = base44.entities[op.entity];
        if (!E) { failed.push(op.summary || op.action); continue; }
        try {
          if (op.entity === "Transaction") {
            await applyTransactionOp(op);
            applied.push(op);
          } else if (op.action === "create") {
            const data = withCreateDefaults(op.entity, cleanData(op.data));
            await E.create(data);
            applied.push(op);
          } else if (op.action === "update" && op.targetId) {
            await E.update(op.targetId, cleanData(op.data));
            applied.push(op);
          } else if (op.action === "delete" && op.targetId) {
            await E.delete(op.targetId);
            applied.push(op);
          } else {
            failed.push(op.summary || `${op.action} (missing targetId)`);
          }
        } catch (e) {
          failed.push(`${op.summary || op.action}: ${e.message || "error"}`);
        }
      }
      const report = `✓ Applied ${applied.length} change${applied.length === 1 ? "" : "s"}` +
        (failed.length ? ` · ⚠ ${failed.length} failed` : "");
      addMsg({ role: "assistant", kind: "text", text: report });
      if (failed.length) {
        addMsg({ role: "assistant", kind: "text", text: failed.map((f) => `• ${f}`).join("\n") });
      }
      setOps(null);
      setOpsOpen(false);
    } finally {
      setOpsBusy(false);
    }
  }

  function withCreateDefaults(entity, data) {
    const out = { ...data };
    if (entity === "Transaction") {
      if (!out.description) out.description = "AI entry";
      if (!out.type) out.type = "expense";
      if (!out.date) out.date = new Date().toISOString().slice(0, 10);
      if (out.amount === undefined) out.amount = 0;
    }
    return out;
  }

  async function applyTransactionOp(op) {
    const T = base44.entities.Transaction;
    if (op.action === "create") {
      const data = withCreateDefaults("Transaction", cleanData(op.data));
      await T.create(data);
      if (data.account_id && balanceApplies(data.date)) await adjustLinkedBalance(data.account_id, txEffect(data));
      return;
    }
    if (op.action === "update" && op.targetId) {
      const old = await T.get(op.targetId);
      const next = cleanData(op.data);
      await T.update(op.targetId, next);
      const oldAcct = old.account_id;
      const newAcct = next.account_id !== undefined ? (next.account_id || null) : oldAcct;
      const oldEff = txEffect(old);
      const merged = { ...old, ...next };
      const newEff = txEffect(merged);
      const oldApplied = balanceApplies(old.date);
      const newApplied = balanceApplies(merged.date);
      if (oldAcct && oldAcct === newAcct) {
        const delta = (newApplied ? newEff : 0) - (oldApplied ? oldEff : 0);
        if (delta !== 0) await adjustLinkedBalance(oldAcct, delta);
      } else {
        if (oldAcct && oldApplied) await adjustLinkedBalance(oldAcct, -oldEff);
        if (newAcct && newApplied) await adjustLinkedBalance(newAcct, newEff);
      }
      return;
    }
    if (op.action === "delete" && op.targetId) {
      const old = await T.get(op.targetId);
      await T.delete(op.targetId);
      if (old.account_id && balanceApplies(old.date)) await adjustLinkedBalance(old.account_id, -txEffect(old));
      return;
    }
    throw new Error(`${op.action} needs a targetId`);
  }

  async function regenerateOps(priorOps, feedback) {
      setOpsBusy(true);
      try {
        const slim = priorOps.map(({ summary, entity, action, targetId, data }) => ({ entity, action, targetId, summary, data }));
        const ctx = buildContext({ ...ctxData, activeAgent });
        const extra = `PREVIOUS PROPOSALS (JSON):\n${JSON.stringify(slim, null, 0)}\n\nUSER FEEDBACK: ${feedback}\n\nRevise the operations to satisfy the feedback. Return the same JSON shape (message + operations).`;
        const prompt = buildPrompt({
          agent: activeAgent,
          sectionName: "Assistant",
          userMessage: extra,
          contextData: ctx,
          sharedCapabilities: SHARED_CAPABILITIES,
        });
        const obj = await callLLM(prompt);
        const opsList = opsFromResponse(obj);
        if (opsList.length) { setOps(opsList); setOpsOpen(true); }
        else addMsg({ role: "assistant", kind: "text", text: "I couldn't regenerate a valid set of changes — try rephrasing." });
      } catch (e) {
        addMsg({ role: "assistant", kind: "text", text: "I couldn't regenerate just now — try rephrasing." });
      } finally {
      setOpsBusy(false);
    }
  }

  const canSend = !busy && (!!input.trim() || !!pendingFile);

  return (
    <>
      <div
        className="flex flex-col rounded-lg border border-white/10 bg-black"
        style={vpHeight ? { height: `${Math.max(240, vpHeight - 144)}px` } : undefined}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 truncate">
              {activeAgent?.name || "Wei"} · {activeAgent?.title || ""} · saved on this device
            </span>
          </div>
          <button
            onClick={handleClear}
            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-white/10">
          {AGENT_LIST.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveAgentKey(a.id)}
              title={a.description}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                a.id === activeAgentKey ? a.badgeColor : "border-white/10 text-white/40 hover:text-white hover:border-white/30"
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <Message key={m.id} m={m} />
          ))}
          {busy && messages[messages.length - 1]?.kind !== "thinking" && (
            <div className="flex items-center gap-2 text-white/40 text-xs font-mono">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3 space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
          />

          {pendingFile && (
            <div className="flex items-center gap-2 p-2 rounded-md border border-white/10 bg-white/5">
              {pendingPreview ? (
                <img src={pendingPreview} alt="preview" className="h-12 w-12 object-cover rounded border border-white/10" />
              ) : (
                <Paperclip className="h-5 w-5 text-white/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">Attached · waiting for your message</p>
                <p className="text-xs text-zinc-200 truncate">{pendingFile.name}</p>
              </div>
              <button
                onClick={removePending}
                className="p-1 text-white/40 hover:text-white transition-all duration-200 ease-out"
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="border-white/10 bg-black text-white/70 hover:text-white hover:border-white/30 shrink-0"
              aria-label="Upload statement"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything — “how do I tackle my debt?” or “add a $50 Visa payment”"
              className="flex-1 min-w-0 h-10 bg-black border border-white/10 rounded-md px-3 text-[16px] sm:text-sm text-zinc-100 placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="bg-emerald-500 text-black hover:bg-emerald-400 shrink-0"
              size="icon"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/30 flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" /> AI can make mistakes — you approve every change before it is applied
          </p>
        </div>
      </div>

      <ApprovalModal
        open={opsOpen}
        operations={ops}
        busy={opsBusy}
        onApprove={executeOps}
        onRegenerate={regenerateOps}
        onClose={() => { setOpsOpen(false); setOps(null); }}
      />
    </>
  );
}

function Message({ m }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${m.kind === "file" ? "border border-white/15 bg-white/5 text-white/70 font-mono" : "bg-emerald-500 text-black"}`}>
          {m.text}
        </div>
      </div>
    );
  }
  if (m.kind === "thinking") {
    return (
      <div className="flex justify-start">
        <div className="border border-white/10 rounded-md px-3 py-2 text-sm text-white/50 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking…
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        {m.agentId && AGENTS[m.agentId] && (
          <span className={`inline-block mb-1 rounded border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider ${AGENTS[m.agentId].badgeColor}`}>
            {AGENTS[m.agentId].name} · {AGENTS[m.agentId].title}
          </span>
        )}
        <div className="border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 whitespace-pre-wrap">
          {m.text}
        </div>
      </div>
    </div>
  );
}