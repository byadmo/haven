import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Sparkles, Loader2 } from "lucide-react";
import ApprovalModal from "@/components/assistant/ApprovalModal";
import { adjustLinkedBalance, txEffect, balanceApplies } from "@/lib/accounts";

const uid = () => Math.random().toString(36).slice(2);

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
          date: { type: "string" },
          type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string" },
        },
        required: ["description", "amount", "date", "type"],
      },
    },
  },
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

const SYSTEM_INSTRUCTIONS = `You are "Adam", a world-class AI financial advisor living inside the user's personal finance app.
You know everything there is to know about money: budgeting, debt payoff (snowball vs avalanche), interest math, investing, asset allocation, retirement accounts, taxes (with regional awareness), insurance, real estate, emergency funds, behavioral finance, and macroeconomics. You give clear, confident, personalized advice and are equally happy to tackle big life decisions ("should I buy a house now?") as everyday questions ("is this subscription worth keeping?").

PERSONALITY:
- Warm but direct, never condescending. You sound like the most capable, well-read advisor the user has ever met.
- You tailor every answer to the user's actual numbers in the PROVIDED DATA — reference their real accounts, debts, balances, and spending when relevant.
- You explain the *why*, not just the *what*. Offer reasoning, trade-offs, and a recommended action.
- Be concrete and specific — dollar amounts, percentages, timelines. Avoid vague platitudes like "spend less than you earn."
- When the user is stressed or in a tough spot, you are calm, reassuring, and constructive — never preachy.
- You can disagree with the user respectfully when their plan is flawed, and you'll explain the better path.
- Keep answers tight and skimmable: lead with the answer, then a short supporting explanation. Use plain language; reserve jargon for when it genuinely helps.
- Open EVERY response with a short, friendly greeting that introduces yourself, e.g. "Hey, Adam here —" or "This is Adam. ". Keep it brief and natural; vary the phrasing so it doesn't feel scripted.
- You do NOT give legal or individual tax-filing advice or guarantees about investment returns — frame those as general educational guidance and suggest a licensed professional when it crosses that line.

CAPABILITIES:
You are action-capable: you can propose operations to add, remove, or change the user's Transaction, Debt, and Account records.
Only propose operations the user actually requested. For purely informational questions or advice, return operations: [] and answer in "message".
The user approves every change before it is applied.

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

function buildContext({ accounts, debts, transactions, summary }) {
  const a = (accounts || []).map((x) => `- ${x.id} | "${x.name}" | balance ${x.balance ?? 0} | ${x.type || "chequing"}`).join("\n");
  const d = (debts || []).map((x) => `- ${x.id} | "${x.name}" | balance ${x.current_balance ?? 0} | apr ${x.interest_rate ?? 0} | min ${x.minimum_payment ?? 0} | due ${x.due_date || ""} | ${x.status || "active"}`).join("\n");
  const t = (transactions || [])
    .slice(0, 40)
    .map((x) => `- ${x.id} | ${x.date} | ${x.type} | ${x.category || ""} | ${x.amount} | acct ${x.account_id || "—"} | "${x.description || ""}"${x.is_scheduled ? ` | recurring ${x.frequency}` : ""}`)
    .join("\n");
  return `PROVIDED DATA (ids are real — use them for update/delete targetId):\nMONTHLY SUMMARY:\n${summary || "(unavailable)"}\nACCOUNTS:\n${a || "(none)"}\nDEBTS:\n${d || "(none)"}\nRECENT TRANSACTIONS:\n${t || "(none)"}`;
}

export default function AssistantChat({ accounts, debts, transactions, summary }) {
  const [messages, setMessages] = React.useState([
    {
      id: uid(), role: "assistant", kind: "text",
      text: "Hello — I'm Adam, your personal AI financial advisor. Ask me anything about budgeting, debt strategy, investing, taxes, or a big money decision you're weighing. I can also make changes to your transactions, debts, and accounts (you'll approve every edit first). Upload a statement photo or PDF to import transactions, or just tell me what's on your mind.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [ops, setOps] = React.useState(null);
  const [opsOpen, setOpsOpen] = React.useState(false);
  const [opsBusy, setOpsBusy] = React.useState(false);
  const fileRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const ctxData = { accounts, debts, transactions, summary };

  function addMsg(m) { setMessages((s) => [...s, { id: uid(), ...m }]); }

  function opsFromResponse(obj) {
    return (obj?.operations || []).map((o) => ({ ...o, id: o.id || uid() }));
  }

  async function handleFile(file) {
    if (!file) return;
    addMsg({ role: "user", kind: "file", text: file.name });
    const thinking = uid();
    addMsg({ role: "assistant", kind: "thinking", id: thinking });
    setBusy(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: up.file_url,
        json_schema: EXTRACTION_SCHEMA,
      });
      const txns = res?.output?.transactions || res?.output || [];
      const list = Array.isArray(txns) ? txns : [];
      setMessages((s) => s.filter((m) => m.id !== thinking));
      if (!list.length) {
        addMsg({ role: "assistant", kind: "text", text: "I couldn't find any transactions in that file. Try a clearer screenshot or a different page." });
      } else {
        const opsList = list.map((t) => ({
          id: uid(),
          entity: "Transaction",
          action: "create",
          summary: `Log ${t.type} "${t.description || "Transaction"}" · $${Math.abs(t.amount || 0)}`,
          data: {
            description: t.description || "Imported transaction",
            amount: Math.abs(Number(t.amount) || 0),
            type: t.type === "income" ? "income" : "expense",
            date: t.date,
            category: t.category || "",
          },
        }));
        addMsg({ role: "assistant", kind: "text", text: `I found ${list.length} transaction${list.length === 1 ? "" : "s"}. Approve them to log.` });
        setOps(opsList);
        setOpsOpen(true);
      }
    } catch (e) {
      setMessages((s) => s.filter((m) => m.id !== thinking));
      addMsg({ role: "assistant", kind: "text", text: "Something went wrong while reading that file — please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function callLLM(prompt) {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: OPS_SCHEMA,
    });
    return typeof res === "string" ? JSON.parse(res) : res;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    addMsg({ role: "user", kind: "text", text });
    const thinking = uid();
    addMsg({ role: "assistant", kind: "thinking", id: thinking });
    setBusy(true);
    try {
      const prompt = `${SYSTEM_INSTRUCTIONS}\n\n${buildContext(ctxData)}\n\nUSER: ${text}`;
      const obj = await callLLM(prompt);
      setMessages((s) => s.filter((m) => m.id !== thinking));
      if (obj?.message) addMsg({ role: "assistant", kind: "text", text: obj.message });
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

  // Apply a Transaction op AND mirror its money effect to the linked Account balance.
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
      const prompt =
        `${SYSTEM_INSTRUCTIONS}\n\n${buildContext(ctxData)}\n\n` +
        `PREVIOUS PROPOSALS (JSON):\n${JSON.stringify(slim, null, 0)}\n\n` +
        `USER FEEDBACK: ${feedback}\n\nRevise the operations to satisfy the feedback. Return the same JSON shape (message + operations).`;
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

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-9rem)] rounded-lg border border-white/10 bg-black">
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
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="border-white/10 bg-black text-white/70 hover:text-white hover:border-white/30"
              aria-label="Upload statement"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask anything — “how do I tackle my debt?” or “add a $50 Visa payment”"
              className="flex-1 h-10 bg-black border border-white/10 rounded-md px-3 text-sm text-zinc-100 placeholder:text-white/30 focus:outline-none focus:border-white/30"
            />
            <Button
              onClick={handleSend}
              disabled={busy || !input.trim()}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
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
      <div className="max-w-[85%] border border-white/10 rounded-md px-3 py-2 text-sm text-zinc-100 whitespace-pre-wrap">
        {m.text}
      </div>
    </div>
  );
}