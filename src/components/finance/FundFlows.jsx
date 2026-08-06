import React from "react";
import { parseISO, format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CalendarClock, Pencil, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { adjustAccountBalance, txEffect } from "@/lib/accounts";
import { useCurrency } from "@/lib/currency-context";

const CATEGORIES = [
  "Income", "Transit (GO/TTC)", "E39/Civic Maintenance", "Christ Like! Inventory",
  "Food/Groceries", "Rent", "Utilities", "Dining", "Other",
];

function FlowRow({ t, onChanged, accountsMap }) {
  const { fmtMoney: fmt } = useCurrency();
  const isIncome = t.type === "income";
  const [edit, setEdit] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  async function remove(e) {
    e.stopPropagation();
    if (t.account_id) await adjustAccountBalance(t.account_id, -txEffect(t));
    await base44.entities.Transaction.delete(t.id);
    onChanged?.();
  }

  async function saveEdit(e, payload) {
    e.preventDefault();
    setSaving(true);
    try {
      const oldEffect = txEffect(t);
      const newType = payload.type ?? t.type;
      const newAmount = parseFloat(payload.amount) || t.amount;
      const newEffect = txEffect({ type: newType, amount: newAmount });
      const oldAcct = t.account_id;
      const newAcct = payload.account_id !== undefined ? (payload.account_id || "") : t.account_id;

      if (oldAcct) await adjustAccountBalance(oldAcct, -oldEffect);
      if (newAcct) await adjustAccountBalance(newAcct, newEffect);

      await base44.entities.Transaction.update(t.id, {
        description: payload.description ?? t.description,
        amount: newAmount,
        type: newType,
        category: payload.category ?? t.category,
        date: payload.date ?? format(parseISO(t.date), "yyyy-MM-dd"),
        account_id: newAcct || undefined,
      });
      setEdit(null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="group flex items-center gap-2.5 py-2.5 border-b border-zinc-800/70 last:border-0">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
          {isIncome ? <ArrowDownLeft className="h-4 w-4 text-emerald-400" /> : <ArrowUpRight className="h-4 w-4 text-rose-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200 truncate">{t.description}</p>
          <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            {t.category}
            {accountsMap[t.account_id] && <span>· {accountsMap[t.account_id].name}</span>}
            {t.is_scheduled && (
              <span className="inline-flex items-center gap-0.5">
                · <CalendarClock className="h-2.5 w-2.5" /> {t.frequency}
              </span>
            )}
            <span>· {format(parseISO(t.date), "MMM d")}</span>
          </p>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
          {isIncome ? "+" : "-"}{fmt(t.amount)}
        </span>
        <Dialog>
          <DialogTrigger asChild>
            <button className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
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
                saveEdit(e, {
                  description: ev.description ?? t.description,
                  amount: ev.amount ?? t.amount,
                  type: ev.type ?? t.type,
                  category: ev.category ?? t.category,
                  date: ev.date ?? format(parseISO(t.date), "yyyy-MM-dd"),
                  account_id: ev.account_id ?? t.account_id ?? "",
                });
              }}
              className="space-y-3"
            >
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Description</Label>
                <Input
                  defaultValue={t.description}
                  onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Amount ($)</Label>
                  <Input type="number" step="0.01" defaultValue={t.amount} onChange={(e) => setEdit((p) => ({ ...p, amount: e.target.value }))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Date</Label>
                  <Input type="date" defaultValue={format(parseISO(t.date), "yyyy-MM-dd")} onChange={(e) => setEdit((p) => ({ ...p, date: e.target.value }))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Type</Label>
                  <Select defaultValue={t.type} onValueChange={(v) => setEdit((p) => ({ ...p, type: v }))}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Category</Label>
                  <Select defaultValue={t.category} onValueChange={(v) => setEdit((p) => ({ ...p, category: v }))}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Account</Label>
                <Select defaultValue={t.account_id || ""} onValueChange={(v) => setEdit((p) => ({ ...p, account_id: v }))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="No account" /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value={null}>No account</SelectItem>
                    {Object.values(accountsMap).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="border-zinc-800 text-zinc-400 hover:bg-zinc-800">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={saving} className="bg-zinc-100 text-zinc-900 hover:bg-white">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <button
          onClick={remove}
          className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete transaction"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

export default function FundFlows({ transactions, onChanged, accounts = [], limit = 12, enableViewAll = false }) {
  const [openIn, setOpenIn] = React.useState(false);
  const [openOut, setOpenOut] = React.useState(false);
  const accountsMap = React.useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const inflows = transactions.filter((t) => t.type === "income");
  const outflows = transactions.filter((t) => t.type === "expense").sort((a, b) => (a.is_scheduled === b.is_scheduled ? 0 : a.is_scheduled ? -1 : 1));
  const shownIn = inflows.slice(0, limit);
  const shownOut = outflows.slice(0, limit);

  const viewAllBtn = (setOpen, count) =>
    enableViewAll && count > limit ? (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-[11px] uppercase tracking-wider text-white/40 hover:text-white transition-colors"
      >
        View all ({count})
      </button>
    ) : null;

  const renderAllDialog = (open, setOpen, title, badgeClass, rows) => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            {title}
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider ${badgeClass}`}>
              {rows.length} entries
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {rows.map((t) => (
            <FlowRow key={t.id} t={t} onChanged={onChanged} accountsMap={accountsMap} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-zinc-100">Inflows</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-medium uppercase tracking-wider">Income</span>
        </div>
        {inflows.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No inflows logged.</p>
        ) : (
          <>
            <div>{shownIn.map((t) => <FlowRow key={t.id} t={t} onChanged={onChanged} accountsMap={accountsMap} />)}</div>
            {viewAllBtn(setOpenIn, inflows.length)}
          </>
        )}
      </div>

      <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 shadow-xl shadow-black/30">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-zinc-100">Outflows</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-medium uppercase tracking-wider">Expenses</span>
        </div>
        {outflows.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No outflows logged.</p>
        ) : (
          <>
            <div>{shownOut.map((t) => <FlowRow key={t.id} t={t} onChanged={onChanged} accountsMap={accountsMap} />)}</div>
            {viewAllBtn(setOpenOut, outflows.length)}
          </>
        )}
      </div>

      {renderAllDialog(openIn, setOpenIn, "Inflows", "bg-emerald-500/15 text-emerald-300", inflows)}
      {renderAllDialog(openOut, setOpenOut, "Outflows", "bg-rose-500/15 text-rose-300", outflows)}
    </div>
  );
}