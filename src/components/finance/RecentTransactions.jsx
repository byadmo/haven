import React from "react";
import { parseISO, format, isToday, isFuture } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Pencil, X, Search, CalendarClock, CreditCard, Check } from "lucide-react";
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
import { applyTxAccountEffect, reverseTxAccountEffect } from "@/lib/accounts";
import { AnimatePresence, motion } from "framer-motion";
import RecurringFields from "@/components/finance/RecurringFields";
import { useCategories, categoryOptions } from "@/lib/categories";
import { useCurrency } from "@/lib/currency-context";
import TransactionExplorerModal from "@/components/finance/TransactionExplorerModal";


function Row({ t, accountsMap, onChanged, categories, bulkMode, selected, onToggleSelect }) {
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
      if (t.account_id) await reverseTxAccountEffect(t);
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
      const newAcct = payload.account_id !== undefined ? (payload.account_id || "") : t.account_id;
      const newDate = payload.date ?? format(parseISO(t.date), "yyyy-MM-dd");
      // Reverse the OLD transaction's effect on its primary account (correctly handles liabilities).
      await reverseTxAccountEffect(t);
      // Apply the NEW transaction's effect (if it has an account and the date has arrived).
      if (newAcct) {
        await applyTxAccountEffect({ account_id: newAcct, type: newType, amount: newAmount, date: newDate });
      }
      await base44.entities.Transaction.update(t.id, {
        description: payload.description ?? t.description,
        amount: newAmount,
        type: newType,
        category: payload.category ?? t.category,
        date: newDate,
        account_id: newAcct || undefined,
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
          {accountsMap[t.account_id] && <span>· {accountsMap[t.account_id].name}</span>}
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
                account_id: ev.account_id ?? t.account_id ?? "",
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
                <Select defaultValue={t.category} onValueChange={(v)=>setEdit(p=>({...p,category:v}))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {categories.map((c)=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400">Account</Label>
              <Select defaultValue={t.account_id||""} onValueChange={(v)=>setEdit(p=>({...p,account_id:v}))}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue placeholder="No account" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value={null}>No account</SelectItem>
                  {Object.values(accountsMap).map((a)=><SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
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

export default function RecentTransactions({ transactions, accounts = [], onChanged, debts = [], refreshKey = 0 }) {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [explorerOpen, setExplorerOpen] = React.useState(false);
  const [payments, setPayments] = React.useState([]);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selected, setSelected] = React.useState(() => new Set());
  const [targetAccountId, setTargetAccountId] = React.useState("");
  const [balanceMode, setBalanceMode] = React.useState("keep");
  const [customBalance, setCustomBalance] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const { categories: cats } = useCategories();
  const options = categoryOptions(cats);

  const accountsMap = React.useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const debtMap = React.useMemo(() => Object.fromEntries((debts || []).map((d) => [d.id, d])), [debts]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function applyBulkReassign() {
    if (!selected.size) return;
    setApplying(true);
    try {
      const target = targetAccountId || "";
      const sel = transactions.filter((t) => selected.has(t.id));
      for (const tx of sel) {
        if (tx.account_id) await reverseTxAccountEffect(tx);
        await base44.entities.Transaction.update(tx.id, { account_id: target || undefined });
        if (target) await applyTxAccountEffect({ account_id: target, type: tx.type, amount: tx.amount, date: tx.date });
      }
      if (balanceMode === "custom" && target && customBalance !== "") {
        const v = Number(customBalance);
        try {
          await base44.entities.Account.update(target, { balance: v });
        } catch {
          await base44.entities.Debt.update(target, { current_balance: v });
        }
      }
      onChanged?.();
      setSelected(new Set());
      setBulkMode(false);
      setTargetAccountId("");
      setCustomBalance("");
      setBalanceMode("keep");
    } finally {
      setApplying(false);
    }
  }

  React.useEffect(() => {
    base44.entities.DebtPayment.list("-date", 500).then(setPayments).catch(() => {});
  }, [refreshKey]);

  const debtRows = payments.map((p) => ({
    _kind: "debt_payment",
    id: `dp_${p.id}`,
    description: `${debtMap[p.debt_id]?.name || "Liability"} payment`,
    category: "Debt Payment",
    type: "expense",
    amount: p.amount || 0,
    date: p.date,
    note: p.note,
  }));

  const allFiltered = [...transactions, ...debtRows]
    .filter((t) => (filter === "all" ? true : t.type === filter))
    .filter((t) =>
      query.trim()
        ? (t.description + " " + (t.category || "")).toLowerCase().includes(query.toLowerCase().trim())
        : true
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const filtered = allFiltered.slice(0, 8);
  const totalCount = allFiltered.length;
  const visible = bulkMode ? allFiltered : filtered;

  const tabs = [
    { id: "all", label: "All" },
    { id: "income", label: "In" },
    { id: "expense", label: "Out" },
  ];

  return (
    <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-5 sm:p-5 shadow-xl shadow-black/30">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="font-semibold text-sm text-zinc-100">Recent Transactions</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setBulkMode((b) => !b); setSelected(new Set()); }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
              bulkMode ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-200" : "border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700"
            }`}
          >
            {bulkMode ? "Done" : "Bulk Edit"}
          </button>
          <div className="flex items-center gap-1 rounded-lg bg-zinc-950/60 border border-zinc-800 p-0.5">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setFilter(tb.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filter === tb.id ? "bg-zinc-700 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by description or category…"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>

      {bulkMode && (
        <div className="flex items-center justify-between mb-2 text-[11px] text-zinc-500">
          <span>{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set(visible.filter((t) => t._kind !== "debt_payment").map((t) => t.id)))}
              className="text-indigo-300 hover:text-indigo-200"
            >Select all</button>
            <button onClick={() => setSelected(new Set())} className="text-zinc-400 hover:text-zinc-200">Clear</button>
          </div>
        </div>
      )}

      <div className="max-h-80 overflow-y-auto -mr-2 pr-2">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No transactions match.</p>
          ) : (
            visible.map((t) =>
              t._kind === "debt_payment"
                ? <DebtPaymentRow key={t.id} t={t} />
                : <Row
                    key={t.id}
                    t={t}
                    accountsMap={accountsMap}
                    onChanged={onChanged}
                    categories={options}
                    bulkMode={bulkMode}
                    selected={selected.has(t.id)}
                    onToggleSelect={toggleSelect}
                  />
            )
          )}
        </AnimatePresence>
      </div>

      {bulkMode ? (
        <div className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[160px] space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-white/50">Move to account</Label>
              <Select value={targetAccountId || "__none"} onValueChange={(v) => setTargetAccountId(v === "__none" ? "" : v)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100 h-9"><SelectValue placeholder="No account" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="__none">No account</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  {debts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name} (liability)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-white/50">Balance</Label>
              <div className="flex gap-1 rounded-md border border-zinc-800 overflow-hidden">
                <button onClick={() => setBalanceMode("keep")} className={`px-2.5 py-1.5 text-xs ${balanceMode === "keep" ? "bg-zinc-700 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}>Keep same</button>
                <button onClick={() => setBalanceMode("custom")} className={`px-2.5 py-1.5 text-xs ${balanceMode === "custom" ? "bg-zinc-700 text-zinc-50" : "text-zinc-500 hover:text-zinc-300"}`}>Custom</button>
              </div>
            </div>
            {balanceMode === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-white/50">New balance</Label>
                <Input type="number" step="0.01" value={customBalance} onChange={(e) => setCustomBalance(e.target.value)} placeholder="0.00" className="bg-zinc-950 border-zinc-800 text-zinc-100 h-9 w-28 tabular-nums" />
              </div>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => { setBulkMode(false); setSelected(new Set()); }} className="border-zinc-800 text-zinc-400 hover:bg-zinc-800">Cancel</Button>
              <Button size="sm" onClick={applyBulkReassign} disabled={applying || !selected.size} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {applying ? "Applying…" : `Apply to ${selected.size}`}
              </Button>
            </div>
          </div>
        </div>
      ) : totalCount > filtered.length ? (
        <button
          onClick={() => setExplorerOpen(true)}
          className="w-full mt-3 py-2 text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-200 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
        >
          Show All ({totalCount})
        </button>
      ) : null}

      <TransactionExplorerModal
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        transactions={transactions}
        debtRows={debtRows}
        accountsMap={accountsMap}
      />
    </div>
  );
}

function DebtPaymentRow({ t }) {
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