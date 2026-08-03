import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Sparkles, Loader2 } from "lucide-react";
import TransactionReview from "@/components/assistant/TransactionReview";

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

export default function AssistantChat({ accounts, summary }) {
  const [messages, setMessages] = React.useState([
    {
      id: uid(),
      role: "assistant",
      kind: "text",
      text: "I'm your finance assistant. Upload a bank statement screenshot or PDF and I'll extract the transactions for you to log — or just ask me anything about your money.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  function addMsg(m) { setMessages((s) => [...s, { id: uid(), ...m }]); }
  function replaceThinking(text, extra) {
    setMessages((s) => s.map((m) => (m.id === extra ? { id: extra, role: "assistant", kind: "text", text } : m)));
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
      const txns = (res?.output?.transactions) || res?.output || [];
      const list = Array.isArray(txns) ? txns : [];
      if (!list.length) {
        replaceThinking("I couldn't find any transactions in that file. Try a clearer screenshot or a different page.", thinking);
      } else {
        addMsg({
          role: "assistant",
          kind: "review",
          text: `I found ${list.length} transaction${list.length === 1 ? "" : "s"}. Review them and log the ones you want:`,
          review: list,
        });
        setMessages((s) => s.filter((m) => m.id !== thinking));
      }
    } catch (e) {
      replaceThinking("Something went wrong while reading that file — please try again.", thinking);
    } finally {
      setBusy(false);
    }
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
      const prompt =
        `You are a concise personal-finance assistant inside the DebtFlow app.\n` +
        `User financial snapshot:\n${summary || "No data available."}\n\n` +
        `Answer the user's question helpfully and concisely in plain text.\n\n` +
        `User: ${text}`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const out = typeof res === "string" ? res : res?.response || res?.text || JSON.stringify(res);
      replaceThinking(out, thinking);
    } catch (e) {
      replaceThinking("I had trouble responding just now — please try again.", thinking);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] rounded-lg border border-white/10 bg-black">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <Message key={m.id} m={m} accounts={accounts} />
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
            placeholder="Ask about your finances, or upload a statement…"
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
          <Sparkles className="h-2.5 w-2.5" /> AI can make mistakes — review before logging
        </p>
      </div>
    </div>
  );
}

function Message({ m, accounts }) {
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
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> reading…
        </div>
      </div>
    );
  }
  if (m.kind === "review") {
    return (
      <div className="flex justify-start">
        <div className="w-full max-w-full space-y-2">
          <p className="text-sm text-white/70">{m.text}</p>
          <TransactionReview transactions={m.review} accounts={accounts} />
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