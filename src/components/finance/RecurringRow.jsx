import React, { useMemo } from "react";
import { parseISO, format } from "date-fns";
import { Repeat, Pencil, X, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { normalizeDesc } from "@/lib/recurring";
import { useCurrency } from "@/lib/currency-context";

const keyOf = (t) => `${t.type || "expense"}::${normalizeDesc(t.description)}`;

// A row in the home "Upcoming & Recurring" list that represents an
// auto-detected recurring pattern. Edit applies a rename / reclassify to ALL
// of the pattern's underlying transaction occurrences at once; delete removes
// every occurrence (the pattern then disappears from detection).
export default function RecurringRow({ item, transactions, accountsMap, categories, onChanged }) {
  const { fmtMoney: fmt } = useCurrency();
  const isIncome = item.type === "income";
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const sourceTxns = useMemo(
    () => transactions.filter((t) => keyOf(t) === item.normalized),
    [transactions, item.normalized]
  );

  function startEdit() {
    const rep = sourceTxns[sourceTxns.length - 1] || {};
    setEdit({
      description: rep.description || item.description,
      type: rep.type || item.type,
      category: rep.category || "",
      account_id: rep.account_id ?? "",
    });
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    if (!sourceTxns.length) return;
    setBusy(true);
    try {
      await base44.entities.Transaction.bulkUpdate(
        sourceTxns.map((t) => ({
          id: t.id,
          description: edit.description,
          type: edit.type,
          category: edit.category,
          account_id: edit.account_id || undefined,
        }))
      );
      setOpen(false);
      setEdit(null);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!sourceTxns.length) return;
    const ok = window.confirm(
      `Delete all ${sourceTxns.length} occurrence${
        sourceTxns.length === 1 ? "" : "s"
      } of "${item.description}"? This removes those transactions.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await Promise.all(sourceTxns.map((t) => base44.entities.Transaction.delete(t.id)));
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-white/5 last:border-0">
      <div className="group flex items-center gap-2.5 py-1.5">
        <div className={`h-6 w-6 rounded-md flex items-center justify-center ${isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
          <CalendarClock className={`h-3 w-3 ${isIncome ? "text-emerald-400" : "text-rose-400"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-200 truncate">{item.description}</p>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
            <span className="whitespace-nowrap">
              {format(parseISO(item.predicted_next_date), "EEE, MMM d")}
            </span>
            <span className="text-white/20">·</span>
            <span className="truncate text-white/40">{item.category || "uncategorized"}</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider text-[9px] whitespace-nowrap">
              {item.frequency}
            </span>
            {item.occurrences > 1 && (
              <span className="flex items-center gap-0.5 text-white/30 whitespace-nowrap">
                <Repeat className="h-2.5 w-2.5" /> {item.occurrences}×
              </span>
            )}
          </p>
        </div>
        <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
          {isIncome ? "+" : "-"}{fmt(item.average_amount)}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={startEdit}
            disabled={busy}
            className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40"
            aria-label="Edit recurring pattern"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
            aria-label="Delete recurring pattern"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && edit && (
        <form onSubmit={save} className="mb-2 rounded-lg border border-white/10 bg-black p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Description</Label>
              <Input
                value={edit.description}
                onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
                className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Type</Label>
              <Select value={edit.type} onValueChange={(v) => setEdit((p) => ({ ...p, type: v }))}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Category</Label>
              <Select
                value={edit.category || "none"}
                onValueChange={(v) => setEdit((p) => ({ ...p, category: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Account</Label>
              <Select
                value={edit.account_id || "none"}
                onValueChange={(v) => setEdit((p) => ({ ...p, account_id: v === "none" ? "" : v }))}
              >
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9">
                  <SelectValue placeholder="No account" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="none">No account</SelectItem>
                  {Object.values(accountsMap).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[11px] text-white/40">
            Applies to all {sourceTxns.length} occurrence{sourceTxns.length === 1 ? "" : "s"} of this recurring pattern.
          </p>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); setEdit(null); }}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 h-9"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} className="bg-indigo-600 hover:bg-indigo-500 text-white h-9">
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}