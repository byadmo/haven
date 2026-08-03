import React from "react";
import { parseISO, format, isToday, isThisWeek, isThisMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Search, CreditCard, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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

function ExplorerRow({ t, accountsMap }) {
  const isIncome = t.type === "income";
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
      <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
        {t._kind === "debt_payment"
          ? <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
          : isIncome
            ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />
            : <ArrowUpRight className="h-3.5 w-3.5 text-rose-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">{t.description}</p>
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
          {t.category}
          {accountsMap[t.account_id] && <span>· {accountsMap[t.account_id].name}</span>}
          <span>· {format(parseISO(t.date), "MMM d, yyyy")}</span>
          {t.is_scheduled && (
            <span className="inline-flex items-center gap-0.5 text-emerald-400/80">
              <CalendarClock className="h-3 w-3" />{t.frequency || "recurring"}
            </span>
          )}
        </p>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
        {isIncome ? "+" : "-"}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export default function TransactionExplorerModal({ open, onOpenChange, transactions, debtRows, accountsMap }) {
  const [dateFilter, setDateFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [customStart, setCustomStart] = React.useState("");
  const [customEnd, setCustomEnd] = React.useState("");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-2xl">
        <DialogTitle className="text-sm font-semibold text-zinc-100">All Transactions</DialogTitle>

        <div className="grid grid-cols-3 gap-2">
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

        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center gap-2">
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

        <p className="text-[10px] uppercase tracking-widest text-white/40">
          {filtered.length} {filtered.length === 1 ? "transaction" : "transactions"}
        </p>

        <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No transactions match.</p>
          ) : (
            filtered.map((t) => (
              <ExplorerRow key={t.id} t={t} accountsMap={accountsMap || {}} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}