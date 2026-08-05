import React from "react";
import { parseISO, format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Pencil, X, CalendarClock, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { adjustTransferInOut, balanceApplies } from "@/lib/accounts";
import { CreditCard } from "lucide-react";
import RecurringFields from "@/components/finance/RecurringFields";
import { useCurrency } from "@/lib/currency-context";

// "into X" / "out of Y" / "From → To" for transfers
function flowText(t, map) {
  const a = map[t.account_id];
  const b = map[t.transfer_account_id];
  if (a && b) return t.type === "income" ? `${b.name} → ${a.name}` : `${a.name} → ${b.name}`;
  if (a) return t.type === "income" ? `into ${a.name}` : `out of ${a.name}`;
  return null;
}

export function TransactionRow({ t, accountsMap, onChanged, categories, bulkMode, selected, onToggleSelect }) {
  const { fmtMoney: fmt } = useCurrency();
  const isIncome = t.type === "income";
  const isSelected = !!selected;
  const [edit, setEdit] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);

  async function fullDelete() {
    setRemoving(true);
    try {
      if (balanceApplies(t.date)) {
        const oldFrom = t.type === "expense" ? t.account_id : t.transfer_account_id;
        const oldTo = t.type === "expense" ? t.transfer_account_id : t.account_id;
        if (oldFrom) await adjustTransferInOut(oldFrom, t.amount, "in");
        if (oldTo) await adjustTransferInOut(oldTo, t.amount, "out");
      }
      await base44.entities.Transaction.delete(t.id);
      setDelOpen(false);
      onChanged?.();
    } finally {
      setRemoving(false);
    }
  }

  async function historyOnly() {
    setRemoving(true);
    try {
      await base44.entities.Transaction.delete(t.id);
      setDelOpen(false);
      onChanged?.();
    } finally {
      setRemoving(false);
    }
  }

  async function save(e, payload) {
    e.preventDefault();
    setSaving(true);
    try {
      const newType = payload.type ?? t.type;
      const newAmount = parseFloat(payload.amount) || t.amount;
      const newDate = payload.date ?? format(parseISO(t.date), "yyyy-MM-dd");
      const oldFrom = t.type === "expense" ? t.account_id : t.transfer_account_id;
      const oldTo = t.type === "expense" ? t.transfer_account_id : t.account_id;
      const newFrom = payload.fromId ?? "";
      const newTo = payload.toId ?? "";

      if (balanceApplies(t.date)) {
        if (oldFrom) await adjustTransferInOut(oldFrom, t.amount, "in");
        if (oldTo) await adjustTransferInOut(oldTo, t.amount, "out");
      }
      if (balanceApplies(newDate)) {
        if (newFrom) await adjustTransferInOut(newFrom, newAmount, "out");
        if (newTo) await adjustTransferInOut(newTo, newAmount, "in");
      }

      const accountId = newType === "expense" ? newFrom : newTo;
      const transferAccountId = newType === "expense" ? newTo : newFrom;
      await base44.entities.Transaction.update(t.id, {
        description: payload.description ?? t.description,
        amount: newAmount,
        type: newType,
        category: payload.category ?? t.category,
        date: newDate,
        account_id: accountId || undefined,
        transfer_account_id: transferAccountId || undefined,
        is_scheduled: payload.is_scheduled ?? false,
        frequency: payload.frequency ?? "one_time",
        next_date: payload.is_scheduled ? payload.next_date : undefined,
        custom_interval: payload.custom_interval,
        custom_unit: payload.custom_unit,
      });
      setEdit(null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="group flex items-center gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
      {bulkMode && (
        <button
          type="button"
          onClick={() => onToggleSelect?.(t.id)}
          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-indigo-500 border-indigo-500" : "border-zinc-600 hover:border-zinc-400"}`}
          aria-label="Select transaction"
        >
          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
        </button>
      )}
      <div className={`h-8 w-8 sm:h-7 sm:w-7 rounded-full flex items-center justify-center shrink-0 ${isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
        {isIncome ? <ArrowDownLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-emerald-400" /> : <ArrowUpRight className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-rose-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">{t.description}</p>
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
          {t.category}
          {(() => {
            const flow = flowText(t, accountsMap);
            return flow ? <span>· {flow}</span> : null;
          })()}
          <span>· {format(parseISO(t.date), "MMM d")}</span>
          {t.is_scheduled && (
            <span className="inline-flex items-center gap-0.5 text-emerald-400/80">
              <CalendarClock className="h-3 w-3" />{t.frequency || "recurring"}
            </span>
          )}
        </p>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
        {isIncome ? "+" : "-"}{fmt(t.amount)}
      </span>
      {!bulkMode && (
      <>
      <Dialog>
        <DialogTrigger asChild>
          <button className="h-11 w-11 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Transaction</DialogTitle>
            <DialogDescription className="text-zinc-500">Update the details of this transaction.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              const ev = edit || {};
              const sched = ev.is_scheduled ?? t.is_scheduled ?? false;
              save(e, {
                description: ev.description ?? t.description,
                amount: ev.amount ?? t.amount,
                type: ev.type ?? t.type,
                category: ev.category ?? t.category,
                date: ev.date ?? format(parseISO(t.date), "yyyy-MM-dd"),
                fromId: ev.from !== undefined ? ev.from : (t.type === "expense" ? (t.account_id || "") : (t.transfer_account_id || "")),
                toId: ev.to !== undefined ? ev.to : (t.type === "expense" ? (t.transfer_account_id || "") : (t.account_id || "")),
                is_scheduled: sched,
                frequency: sched ? (ev.frequency ?? t.frequency ?? "monthly") : "one_time",
                next_date: sched
                  ? (ev.next_date ?? (t.next_date ? format(parseISO(t.next_date), "yyyy-MM-dd") : format(parseISO(t.date), "yyyy-MM-dd")))
                  : undefined,
                custom_interval: sched && (ev.frequency ?? t.frequency) === "custom" ? (parseInt(ev.custom_interval ?? t.custom_interval) || 1) : undefined,
                custom_unit: sched && (ev.frequency ?? t.frequency) === "custom" ? (ev.custom_unit ?? t.custom_unit ?? "weeks") : undefined,
              });
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label className="text-zinc-400">Description</Label>
              <Input defaultValue={t.description} onChange={(e)=>setEdit(p=>({...p,description:e.target.value}))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Amount ($)</Label>
                <Input type="number" step="0.01" defaultValue={t.amount} onChange={(e)=>setEdit(p=>({...p,amount:e.target.value}))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Date</Label>
                <Input type="date" defaultValue={format(parseISO(t.date),"yyyy-MM-dd")} onChange={(e)=>setEdit(p=>({...p,date:e.target.value}))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Type</Label>
                <Select defaultValue={t.type} onValueChange={(v)=>setEdit(p=>({...p,type:v}))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Category</Label>
                <Select defaultValue={t.category || "__none"} onValueChange={(v)=>setEdit(p=>({...p,category:v==="__none"?"":v}))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="__none">No category</SelectItem>
                    {Array.from(new Set([t.category, ...categories])).filter(Boolean).map((c)=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400">From</Label>
                <Select
                  defaultValue={(edit?.from !== undefined ? edit.from : (t.type === "expense" ? t.account_id : t.transfer_account_id)) || "__none"}
                  onValueChange={(v) => setEdit((p) => ({ ...p, from: v === "__none" ? "" : v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="No account" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="__none">No account</SelectItem>
                    {Object.values(accountsMap).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">To</Label>
                <Select
                  defaultValue={(edit?.to !== undefined ? edit.to : (t.type === "expense" ? t.transfer_account_id : t.account_id)) || "__none"}
                  onValueChange={(v) => setEdit((p) => ({ ...p, to: v === "__none" ? "" : v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="No account" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="__none">No account</SelectItem>
                    {Object.values(accountsMap).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <RecurringFields
              scheduled={edit?.is_scheduled ?? t.is_scheduled ?? false}
              onScheduledChange={(v) => setEdit((p) => ({ ...p, is_scheduled: v }))}
              frequency={edit?.frequency ?? t.frequency ?? "monthly"}
              onFrequencyChange={(v) => setEdit((p) => ({ ...p, frequency: v }))}
              nextDate={edit?.next_date ?? (t.next_date ? format(parseISO(t.next_date), "yyyy-MM-dd") : format(parseISO(t.date), "yyyy-MM-dd"))}
              onNextDateChange={(v) => setEdit((p) => ({ ...p, next_date: v }))}
              customInterval={edit?.custom_interval ?? t.custom_interval ?? 1}
              onCustomIntervalChange={(v) => setEdit((p) => ({ ...p, custom_interval: v }))}
              customUnit={edit?.custom_unit ?? t.custom_unit ?? "weeks"}
              onCustomUnitChange={(v) => setEdit((p) => ({ ...p, custom_unit: v }))}
            />
            <DialogFooter className="pt-2">
              <DialogClose asChild><Button type="button" variant="outline" className="border-zinc-800 text-zinc-400 hover:bg-zinc-800">Cancel</Button></DialogClose>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">{saving?"Saving…":"Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogTrigger asChild>
          <button className="h-11 w-11 rounded-md flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" aria-label="Delete">
            <X className="h-3.5 w-3.5" />
          </button>
        </DialogTrigger>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Remove transaction</DialogTitle>
            <DialogDescription className="text-zinc-500">Choose how to remove this transaction.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={removing}
              onClick={fullDelete}
              className="w-full text-left rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
              <span className="block font-medium text-rose-100">Delete & reverse balance</span>
              <span className="block text-[11px] text-rose-300/70">Removes the record and undoes its effect on the account.</span>
            </button>
            <button
              type="button"
              disabled={removing}
              onClick={historyOnly}
              className="w-full text-left rounded-lg border border-zinc-800 bg-black px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <span className="block font-medium text-zinc-100">Remove from history only</span>
              <span className="block text-[11px] text-zinc-500">Deletes the record but keeps the balance as-is.</span>
            </button>
          </div>
          <div className="flex justify-end pt-2">
            <DialogClose asChild><Button type="button" variant="outline" className="border-zinc-800 text-zinc-400 hover:bg-zinc-800">Cancel</Button></DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}

export function DebtPaymentRow({ t }) {
  const { fmtMoney: fmt } = useCurrency();
  return (
    <div className="group flex items-center gap-3 py-3 sm:py-2 border-b border-zinc-800/60 last:border-0">
      <div className="h-8 w-8 sm:h-7 sm:w-7 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15">
        <CreditCard className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-emerald-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">{t.description}</p>
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
          {t.category}
          {t.note && <span>· {t.note}</span>}
          <span>· {format(parseISO(t.date), "MMM d")}</span>
        </p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-rose-400">
        -{fmt(t.amount)}
      </span>
    </div>
  );
}