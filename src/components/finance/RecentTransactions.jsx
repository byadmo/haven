import React from "react";
import { Search } from "lucide-react";
import { base44 } from "@/api/base44Client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { applyTxAccountEffect, reverseTxAccountEffect } from "@/lib/accounts";
import { AnimatePresence } from "framer-motion";
import { useCategories, categoryOptions } from "@/lib/categories";
import TransactionExplorerModal from "@/components/finance/TransactionExplorerModal";
import { TransactionRow as Row, DebtPaymentRow } from "@/components/finance/TransactionRows";


export default function RecentTransactions({ transactions, accounts = [], onChanged, debts = [], refreshKey = 0 }) {
  const [filter, setFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [explorerOpen, setExplorerOpen] = React.useState(false);
  const [payments, setPayments] = React.useState([]);
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selected, setSelected] = React.useState(() => new Set());
  const [taxOnly, setTaxOnly] = React.useState(false);
  const [targetAccountId, setTargetAccountId] = React.useState("");
  const [balanceMode, setBalanceMode] = React.useState("keep");
  const [customBalance, setCustomBalance] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const { categories: cats } = useCategories();
  const options = categoryOptions(cats);

  const accountsMap = React.useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const debtMap = React.useMemo(() => Object.fromEntries((debts || []).map((d) => [d.id, d])), [debts]);
  const allAccountsMap = React.useMemo(() => ({ ...accountsMap, ...debtMap }), [accountsMap, debtMap]);

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

  async function applyBulkTax() {
    if (!selected.size) return;
    setApplying(true);
    try {
      const sel = transactions.filter((t) => selected.has(t.id));
      await Promise.all(sel.map((t) => base44.entities.Transaction.update(t.id, { is_tax_deductible: true })));
      onChanged?.();
      setSelected(new Set());
      setBulkMode(false);
    } finally { setApplying(false); }
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
    .filter((t) => (taxOnly ? t.is_tax_deductible : true))
    .filter((t) =>
      query.trim()
        ? (t.description + " " + (t.category || "")).toLowerCase().includes(query.toLowerCase().trim())
        : true
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const filtered = allFiltered.slice(0, 30);
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
          <button
            onClick={() => setTaxOnly((v) => !v)}
            className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${taxOnly ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200" : "border-zinc-800 text-zinc-400 hover:text-zinc-100"}`}
          >Tax-only</button>
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
          <div className="flex gap-2 items-center">
            <button
              onClick={applyBulkTax}
              disabled={applying || !selected.size}
              className="text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
            >Mark tax-deductible</button>
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
                    accountsMap={allAccountsMap}
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
        accounts={accounts}
        debts={debts}
        onChanged={onChanged}
        accountsMap={allAccountsMap}
      />
    </div>
  );
}