import React from "react";
import { parseISO, format, isFuture } from "date-fns";
import { CalendarClock, Pencil, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RecurringFields from "@/components/finance/RecurringFields";
import RecurringRow from "@/components/finance/RecurringRow";
import SuppressChoiceDialog from "@/components/finance/SuppressChoiceDialog";
import { useCategories, categoryOptions } from "@/lib/categories";
import { useCurrency } from "@/lib/currency-context";
import { getRecurring, normalizeDesc } from "@/lib/recurring";
import { isTransactionSuppressed } from "@/lib/recurringSuppression";

function Row({ t, accountsMap, categories, onChanged, dueLabel }) {
  const { fmtMoney: fmt } = useCurrency();
  const isIncome = t.type === "income";
  const due = parseISO(t.date);
  const [open, setOpen] = React.useState(false);
  const [edit, setEdit] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [stopping, setStopping] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);

  function startEdit() {
    setEdit({
      description: t.description,
      amount: String(t.amount),
      type: t.type,
      category: t.category,
      date: format(parseISO(t.date), "yyyy-MM-dd"),
      account_id: t.account_id ?? "",
      is_scheduled: t.is_scheduled ?? false,
      frequency: t.frequency ?? "monthly",
      next_date: t.next_date
        ? format(parseISO(t.next_date), "yyyy-MM-dd")
        : format(parseISO(t.date), "yyyy-MM-dd"),
      custom_interval: t.custom_interval ?? 1,
      custom_unit: t.custom_unit ?? "weeks",
    });
    setOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const ev = edit || {};
      await base44.entities.Transaction.update(t.id, {
        description: ev.description,
        amount: parseFloat(ev.amount),
        type: ev.type,
        category: ev.category,
        date: ev.date,
        account_id: ev.account_id || undefined,
        is_scheduled: ev.is_scheduled,
        frequency: ev.is_scheduled ? ev.frequency : "one_time",
        next_date: ev.is_scheduled ? ev.next_date : undefined,
        custom_interval: ev.is_scheduled && ev.frequency === "custom" ? (parseInt(ev.custom_interval) || 1) : undefined,
        custom_unit: ev.is_scheduled && ev.frequency === "custom" ? ev.custom_unit : undefined,
      });
      setOpen(false);
      setEdit(null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function stopOneTime() {
    setStopping(true);
    try {
      await base44.entities.Transaction.update(t.id, { recurring_suppressed: true, is_scheduled: false });
      setShowDelete(false);
      onChanged?.();
    } finally {
      setStopping(false);
    }
  }

  async function removeFromHistory() {
    setDeleting(true);
    try {
      await base44.entities.Transaction.delete(t.id);
      setShowDelete(false);
      onChanged?.();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <div className="group flex items-center gap-2.5 py-2">
        <div className={`h-6 w-6 rounded-md flex items-center justify-center ${isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
          <CalendarClock className={`h-3 w-3 ${isIncome ? "text-emerald-400" : "text-rose-400"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-zinc-200 truncate">{t.description}</p>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
            <span className="whitespace-nowrap">{dueLabel || format(due, "EEE, MMM d")}</span>
            <span className="text-white/20">·</span>
            <span className="truncate text-white/40">{t.category || "uncategorized"}</span>
          </p>
        </div>
        <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
          {isIncome ? "+" : "-"}
          {fmt(t.amount)}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={startEdit}
            className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            disabled={deleting}
            className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            aria-label="Delete"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <SuppressChoiceDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title={`Stop "${t.description}"?`}
        description="Choose how to remove this upcoming transaction."
        suppressLabel="Stop this payment"
        suppressDescription="Stops it from appearing in Upcoming & Recurring — even after the AI re-scans. Your statistics stay the same."
        deleteLabel="Also remove from transaction history"
        deleteDescription="Permanently deletes this transaction. This affects your statistics."
        busy={deleting || stopping}
        onSuppress={stopOneTime}
        onDelete={removeFromHistory}
      />

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
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={edit.amount}
                onChange={(e) => setEdit((p) => ({ ...p, amount: e.target.value }))}
                className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Date</Label>
              <Input
                type="date"
                value={edit.date}
                onChange={(e) => setEdit((p) => ({ ...p, date: e.target.value }))}
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
              <Select value={edit.category} onValueChange={(v) => setEdit((p) => ({ ...p, category: v }))}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Account</Label>
              <Select value={edit.account_id} onValueChange={(v) => setEdit((p) => ({ ...p, account_id: v }))}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-9">
                  <SelectValue placeholder="No account" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value={null}>No account</SelectItem>
                  {Object.values(accountsMap).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <RecurringFields
            scheduled={edit.is_scheduled}
            onScheduledChange={(v) => setEdit((p) => ({ ...p, is_scheduled: v }))}
            frequency={edit.frequency}
            onFrequencyChange={(v) => setEdit((p) => ({ ...p, frequency: v }))}
            nextDate={edit.next_date}
            onNextDateChange={(v) => setEdit((p) => ({ ...p, next_date: v }))}
            customInterval={edit.custom_interval}
            onCustomIntervalChange={(v) => setEdit((p) => ({ ...p, custom_interval: v }))}
            customUnit={edit.custom_unit}
            onCustomUnitChange={(v) => setEdit((p) => ({ ...p, custom_unit: v }))}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white h-9">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function UpcomingRecurring({ transactions, accounts = [], onChanged }) {
  const { categories: cats } = useCategories();
  const options = categoryOptions(cats);
  const accountsMap = React.useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  // Single source of truth: combined auto-detected + manually-flagged recurring.
  const recurring = React.useMemo(() => getRecurring(transactions), [transactions]);
  const recurringKeys = React.useMemo(() => new Set(recurring.map((r) => r.normalized)), [recurring]);

  // One-time upcoming: future-dated, NOT part of any recurring pattern.
  const oneTime = React.useMemo(
    () => transactions
      .filter((t) => {
        try { if (!isFuture(parseISO(t.date))) return false; } catch { return false; }
        if (t.is_scheduled) return false;
        if (t.recurring_suppressed) return false;
        if (isTransactionSuppressed(t.id)) return false;
        return !recurringKeys.has(`${t.type || "expense"}::${normalizeDesc(t.description)}`);
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8),
    [transactions, recurringKeys]
  );

  return (
    <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <CalendarClock className="h-3.5 w-3.5 text-indigo-300" />
          </div>
          <h2 className="font-semibold text-sm text-zinc-100">Upcoming &amp; Recurring</h2>
        </div>
      </div>

      {recurring.length === 0 ? (
        <p className="text-xs text-white/40 py-2">No recurring patterns detected yet — add 3+ consistent occurrences and they'll appear here.</p>
      ) : (
        <div className="space-y-1">
          {recurring.map((it) => (
            <RecurringRow
              key={it.normalized}
              item={it}
              transactions={transactions}
              accountsMap={accountsMap}
              categories={options}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}

      {oneTime.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="h-3.5 w-3.5 text-emerald-300" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Upcoming One-Time Payments</h3>
          </div>
          <div className="space-y-1">
            {oneTime.map((t) => (
              <Row key={t.id} t={t} accountsMap={accountsMap} categories={options} onChanged={onChanged} dueLabel={format(parseISO(t.date), "EEE, MMM d")} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}