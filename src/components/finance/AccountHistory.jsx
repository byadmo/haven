import React from "react";
import { History, CreditCard, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCategories, categoryOptions } from "@/lib/categories";
import { TransactionRow } from "@/components/finance/TransactionRows";

export default function AccountHistory({ accounts = [], debts = [], transactions = [], onChanged }) {
  const { categories } = useCategories();
  const options = categoryOptions(categories);

  // Bank accounts + credit cards (liabilities) are each a "holder" of its own history.
  const holders = React.useMemo(() => {
    const activeDebts = debts.filter((d) => (d.status || "active") !== "paid_off");
    return [
      ...accounts.map((a) => ({ ...a, _kind: "account", _icon: Landmark, _color: "text-emerald-300" })),
      ...activeDebts.map((d) => ({ ...d, _kind: "debt", _icon: CreditCard, _color: "text-rose-300" })),
    ];
  }, [accounts, debts]);

  const txFor = React.useCallback(
    (id) => transactions.filter((t) => t.account_id === id || t.transfer_account_id === id),
    [transactions]
  );

  const counts = React.useMemo(() => {
    const map = {};
    holders.forEach((h) => (map[h.id] = txFor(h.id).length));
    return map;
  }, [holders, transactions]);

  const accountsMap = React.useMemo(() => {
    const m = {};
    accounts.forEach((a) => (m[a.id] = a));
    debts.forEach((d) => (m[d.id] = d));
    return m;
  }, [accounts, debts]);

  const [selected, setSelected] = React.useState("");
  React.useEffect(() => {
    if (!selected && holders.length) setSelected(holders[0].id);
    if (selected && !holders.find((h) => h.id === selected) && holders.length) setSelected(holders[0].id);
  }, [holders]);

  if (!holders.length) return null;

  const active = holders.find((h) => h.id === selected) || holders[0];
  const rows = txFor(active.id)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="rounded-lg bg-black border border-white/10 p-4 sm:p-5 mt-4">
      <div className="flex items-center gap-1.5 mb-3">
        <History className="h-3.5 w-3.5 text-white/50" />
        <h3 className="text-[11px] uppercase tracking-widest text-white/50 font-semibold">Account History</h3>
      </div>

      {/* Holder pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {holders.map((h) => {
          const Icon = h._icon;
          const isSel = h.id === active.id;
          return (
            <button
              key={h.id}
              onClick={() => setSelected(h.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                isSel ? "border-white/40 bg-white/10 text-zinc-50" : "border-white/10 text-white/50 hover:text-white/80 hover:border-white/20"
              }`}
            >
              <Icon className={`h-3 w-3 ${isSel ? h._color : ""}`} />
              <span className="max-w-[120px] truncate">{h.name}</span>
              <span className="text-[10px] text-white/30 tabular-nums">{counts[h.id] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Selected holder header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-zinc-100 truncate flex items-center gap-1.5">
          <active._icon className={`h-3.5 w-3.5 ${active._color}`} />
          {active.name}
        </p>
        <span className="text-[10px] uppercase tracking-widest text-white/40">
          {rows.length} {rows.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div className="min-h-[4rem]">
        {rows.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">No transactions linked to this account yet.</p>
        ) : (
          <AnimatePresence mode="popLayout">
            {rows.map((t) => (
              <TransactionRow key={t.id} t={t} accountsMap={accountsMap} onChanged={onChanged} categories={options} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}