import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Check, ArrowDownRight, ArrowUpRight } from "lucide-react";

const fmt = (v) =>
  (Math.abs(v || 0)).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

function normDate(d) {
  const dt = new Date(d);
  if (!isNaN(dt)) return dt.toISOString().slice(0, 10);
  return d;
}

export default function TransactionReview({ transactions, accounts, onLogged }) {
  const [selected, setSelected] = React.useState(() => transactions.map(() => true));
  const [accountId, setAccountId] = React.useState(accounts?.[0]?.id || "");
  const [logging, setLogging] = React.useState(false);
  const [done, setDone] = React.useState(null);

  const toggle = (i) => setSelected((s) => s.map((v, j) => (j === i ? !v : v)));
  const count = selected.filter(Boolean).length;

  async function log() {
    setLogging(true);
    try {
      const rows = transactions
        .map((t, i) => ({ t, i }))
        .filter(({ i }) => selected[i])
        .map(({ t }) => ({
          description: t.description || "Imported transaction",
          amount: Math.abs(Number(t.amount) || 0),
          type: t.type === "income" ? "income" : "expense",
          date: normDate(t.date),
          category: t.category || "",
          account_id: accountId || undefined,
        }));
      const created = await base44.entities.Transaction.bulkCreate(rows);
      setDone(rows.length);
      onLogged?.(rows.length, created);
    } finally {
      setLogging(false);
    }
  }

  if (done != null) {
    return (
      <div className="border border-emerald-500/30 bg-black p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Check className="h-4 w-4" />
          <span className="text-sm font-mono uppercase tracking-widest">Logged {done} transaction{done === 1 ? "" : "s"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-white/10 bg-black p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">
          {transactions.length} extracted
        </p>
        <div className="w-48">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-8 bg-black text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {transactions.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-2 border border-white/10 rounded-sm hover:bg-white/5">
            <Checkbox checked={selected[i]} onCheckedChange={() => toggle(i)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-100 truncate">{t.description || "—"}</p>
              <p className="text-[10px] font-mono tabular-nums text-white/40">{normDate(t.date)}</p>
            </div>
            <div className={`flex items-center gap-1 tabular-nums font-mono text-sm ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
              {t.type === "income" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {fmt(t.amount)}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={log}
        disabled={count === 0 || logging}
        className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-mono uppercase tracking-widest text-xs"
      >
        {logging ? "Logging…" : `Log ${count} transaction${count === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}