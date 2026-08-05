import React from "react";
import { parseISO, format, isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Search, Plus, Trash2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { adjustTransferInOut, balanceApplies } from "@/lib/accounts";
import { useCategories, categoryOptions } from "@/lib/categories";
import { TransactionRow, DebtPaymentRow } from "@/components/finance/TransactionRows";
import { getDuplicateClusters } from "@/lib/duplicates";
import QuickAddModal from "@/components/finance/QuickAddModal";

const DATE_FILTERS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
];

function matchesDateFilter(dateStr, filter, customStart, customEnd) {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  switch (filter) {
    case "today": return isToday(d);
    case "week": return isThisWeek(d, { weekStartsOn: 1 });
    case "month": return isThisMonth(d);
    case "custom":
      if (!customStart || !customEnd) return true;
      return isWithinInterval(d, { start: startOfDay(parseISO(customStart)), end: endOfDay(parseISO(customEnd)) });
    default: return true;
  }
}

export default function TransactionExplorerModal({ open, onOpenChange, transactions, debtRows, accountsMap, accounts = [], debts = [], onChanged }) {
  const { categories } = useCategories();
  const options = categoryOptions(categories);
  const [dateFilter, setDateFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selected, setSelected] = React.useState(new Set());
  const [deleting, setDeleting] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [dupIds, setDupIds] = React.useState(new Set());
  const [groupIds, setGroupIds] = React.useState(new Set());
  const [dupClusters, setDupClusters] = React.useState([]);

  const allRows = React.useMemo(() => [...transactions, ...debtRows], [transactions, debtRows]);

  const filtered = React.useMemo(() => {
    return allRows
      .filter((t) => (typeFilter === "all" ? true : t.type === typeFilter))
      .filter((t) => matchesDateFilter(t.date, dateFilter, customStart, customEnd))
      .filter((t) =>
        query.trim()
          ? (t.description + " " + (t.category || "")).toLowerCase().includes(query.toLowerCase().trim())
          : true
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allRows, typeFilter, dateFilter, customStart, customEnd, query]);

  const totalIn = filtered.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const net = totalIn - totalOut;

  const typeTabs = [
    { id: "all", label: "All" },
    { id: "income", label: "In" },
    { id: "expense", label: "Out" },
  ];

  const selectableIds = React.useMemo(() => filtered.filter((t) => t._kind !== "debt_payment").map((t) => t.id), [filtered]);

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(selectableIds));
  const clearAll = () => setSelected(new Set());

  const detectDuplicates = () => {
    const clusters = getDuplicateClusters(transactions);
    const gIds = new Set();
    const dups = new Set();
    clusters.forEach((cl) => {
      cl.forEach((r) => gIds.add(r.id));
      cl.slice(1).forEach((r) => dups.add(r.id));
    });
    setDupClusters(clusters);
    setGroupIds(gIds);
    setDupIds(dups);
    setBulkMode(true);
    setSelected(new Set(dups));
  };

  async function removeTransactions(list) {
    for (const t of list) {
      if (t._kind === "debt_payment") continue;
      if (balanceApplies(t.date)) {
        const oldFrom = t.type === "expense" ? t.account_id : t.transfer_account_id;
        const oldTo = t.type === "expense" ? t.transfer_account_id : t.account_id;
        if (oldFrom) await adjustTransferInOut(oldFrom, t.amount, "in");
        if (oldTo) await adjustTransferInOut(oldTo, t.amount, "out");
      }
      await base44.entities.Transaction.delete(t.id);
    }
  }

  async function bulkDelete() {
    setDeleting(true);
    try {
      await removeTransactions(filtered.filter((t) => selected.has(t.id) && t._kind !== "debt_payment"));
      setSelected(new Set());
      setBulkMode(false);
      setConfirmOpen(false);
      onChanged?.();
    } finally {
      setDeleting(false);
    }
  }

  function keepDuplicateGroup(cluster) {
    const ids = new Set(cluster.map((r) => r.id));
    setDupClusters((cs) => cs.filter((cl) => cl !== cluster));
    setGroupIds((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
    setDupIds((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
    setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
  }

  async function deleteDuplicateGroup(cluster) {
    const ids = new Set(cluster.map((r) => r.id));
    setDeleting(true);
    try {
      await removeTransactions(cluster.filter((t) => t._kind !== "debt_payment"));
      setDupClusters((cs) => cs.filter((cl) => cl !== cluster));
      setGroupIds((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
      setDupIds((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
      setSelected((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; });
      onChanged?.();
    } finally {
      setDeleting(false);
    }
  }

  async function deleteDuplicate(id) {
    const t = transactions.find((x) => x.id === id);
    if (!t || t._kind === "debt_payment") return;
    setDeleting(true);
    try {
      await removeTransactions([t]);
      setDupClusters((cs) => cs.map((cl) => cl.filter((r) => r.id !== id)).filter((cl) => cl.length > 1));
      setGroupIds((s) => { const n = new Set(s); n.delete(id); return n; });
      setDupIds((s) => { const n = new Set(s); n.delete(id); return n; });
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      onChanged?.();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-3xl flex flex-col max-h-[90dvh] gap-3 overflow-hidden p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 shrink-0 pr-10">
          <DialogTitle className="text-sm font-semibold text-zinc-100">All Transactions</DialogTitle>
          <div className="flex items-center gap-2">
            {groupIds.size > 0 && (
              <span className="text-[10px] uppercase tracking-widest text-amber-400">{groupIds.size} flagged</span>
            )}
            <button
              type="button"
              onClick={detectDuplicates}
              className="h-8 px-3 rounded-md text-xs font-medium border border-white/10 bg-black text-white/60 hover:text-white/90 hover:border-white/20 transition-colors"
            >
              Detect duplicates
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 shrink-0">
          <div className="rounded-lg border border-white/10 bg-black p-2.5">
            <p className="text-[9px] uppercase tracking-widest text-white/40">Income</p>
            <p className="text-sm font-mono tabular-nums text-emerald-400">
              +${totalIn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black p-2.5">
            <p className="text-[9px] uppercase tracking-widest text-white/40">Expense</p>
            <p className="text-sm font-mono tabular-nums text-rose-400">
              -${totalOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-black p-2.5">
            <p className="text-[9px] uppercase tracking-widest text-white/40">Net</p>
            <p className={`text-sm font-mono tabular-nums ${net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {net >= 0 ? "+" : "-"}${Math.abs(net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => setAddOpen(true)} className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
          <button
            type="button"
            onClick={() => { setBulkMode((v) => !v); setSelected(new Set()); }}
            className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${bulkMode ? "bg-white/10 border-white/20 text-zinc-50" : "bg-black border-white/10 text-white/60 hover:text-white/90"}`}
          >
            {bulkMode ? "Done" : "Select"}
          </button>
          {bulkMode && (
            <>
              <button type="button" onClick={selectAll} className="h-8 px-3 rounded-md text-xs font-medium border border-white/10 bg-black text-white/60 hover:text-white/90 transition-colors">
                Select all
              </button>
              <button type="button" onClick={clearAll} disabled={selected.size === 0} className="h-8 px-3 rounded-md text-xs font-medium border border-white/10 bg-black text-white/60 hover:text-white/90 disabled:opacity-40 transition-colors">
                Clear
              </button>
            </>
          )}
          <div className="flex items-center gap-0.5 rounded-lg bg-black border border-white/10 p-0.5">
            {DATE_FILTERS.map((df) => (
              <button
                key={df.id}
                onClick={() => setDateFilter(df.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  dateFilter === df.id ? "bg-white/10 text-zinc-50" : "text-white/40 hover:text-white/70"
                }`}
              >
                {df.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5 rounded-lg bg-black border border-white/10 p-0.5">
            {typeTabs.map((tb) => (
              <button
                key={tb.id}
                onClick={() => setTypeFilter(tb.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  typeFilter === tb.id ? "bg-white/10 text-zinc-50" : "text-white/40 hover:text-white/70"
                }`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-white/10 bg-black pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        {dateFilter === "custom" && (
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-black border-white/10 text-zinc-200 text-xs h-9 flex-1"
            />
            <span className="text-white/40 text-xs">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-black border-white/10 text-zinc-200 text-xs h-9 flex-1"
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2 shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
            {bulkMode && selected.size > 0 && <span className="ml-2 text-indigo-400">· {selected.size} selected</span>}
          </p>
          {bulkMode && selected.size > 0 && (
            <Button size="sm" onClick={() => setConfirmOpen(true)} className="h-8 bg-rose-600 hover:bg-rose-500 text-white">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete {selected.size}
            </Button>
          )}
        </div>

        {dupClusters.length > 0 && (
          <div className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/[0.03] p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-amber-400">Duplicate groups · {dupClusters.length}</p>
              <span className="text-[10px] text-white/40">green = keep · orange = remove</span>
            </div>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-0.5">
              {dupClusters.map((cl, ci) => (
                <div key={ci} className="rounded-md border border-white/10 bg-black p-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-white/40">
                      Group {ci + 1} · {cl.length} charges · same amount &amp; account within 3 days
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => keepDuplicateGroup(cl)} disabled={deleting} className="h-7 px-2 rounded-md border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 text-[10px] uppercase tracking-widest disabled:opacity-40">
                        <Check className="h-3 w-3" /> Keep
                      </button>
                      <button type="button" onClick={() => deleteDuplicateGroup(cl)} disabled={deleting} className="h-7 px-2 rounded-md border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 flex items-center gap-1 text-[10px] uppercase tracking-widest disabled:opacity-40">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {cl.map((r, ri) => {
                      const keeper = ri === 0;
                      const acct = accountsMap?.[r.account_id]?.name || "—";
                      return (
                        <div key={r.id} className={`rounded-md border px-2.5 py-2 flex items-center gap-2 ${keeper ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>
                          <span className={`text-[9px] uppercase tracking-widest shrink-0 ${keeper ? "text-emerald-400" : "text-amber-400"}`}>{keeper ? "Keep" : "Dup"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-100 truncate">{r.description || "(no description)"}</p>
                            <p className="text-[10px] text-white/40 font-mono">{format(parseISO(r.date), "MMM d, yyyy")} · {acct}{r.category ? ` · ${r.category}` : ""}</p>
                          </div>
                          <span className="text-sm font-mono tabular-nums text-zinc-100 shrink-0">${Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          {!keeper && (
                            <button type="button" onClick={() => deleteDuplicate(r.id)} disabled={deleting} className="shrink-0 h-7 w-7 rounded-md border border-amber-500/40 text-amber-400 hover:bg-amber-500/20 flex items-center justify-center disabled:opacity-40">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-1 px-1 pb-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No transactions match.</p>
          ) : (
            filtered.map((t) =>
              t._kind === "debt_payment"
                ? <DebtPaymentRow key={t.id} t={t} />
                : <TransactionRow key={t.id} t={t} accountsMap={accountsMap || {}} onChanged={onChanged} categories={options} bulkMode={bulkMode} selected={selected.has(t.id)} onToggleSelect={toggle} flagged={groupIds.has(t.id)} />
            )
          )}
        </div>
      </DialogContent>

      <QuickAddModal
        open={addOpen}
        onOpenChange={setAddOpen}
        accounts={accounts}
        debts={debts}
        onSaved={onChanged}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-black border-white/10 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-100">Delete {selected.size} transaction{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This permanently removes the selected transactions and reverses their balance impact. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-black border-white/10 text-zinc-200 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); bulkDelete(); }}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}