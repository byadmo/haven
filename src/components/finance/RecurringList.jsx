import React, { useMemo } from "react";
import { parseISO, format } from "date-fns";
import { Repeat } from "lucide-react";
import { getRecurring } from "@/lib/recurring";
import { useCurrency } from "@/lib/currency-context";

// Shared rendering of combined recurring-payment entries. Used by BOTH the
// home "Upcoming & Recurring" widget and the Cash Flow page so they stay in
// sync (one source of truth via getRecurring).
export function RecurringItem({ item }) {
  const { fmtMoney: fmt } = useCurrency();
  const isIncome = item.type === "income";
  return (
    <div className="flex items-center justify-between gap-2.5 py-1.5 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-zinc-200 truncate">{item.description}</p>
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
          <span className="whitespace-nowrap">{format(parseISO(item.predicted_next_date), "EEE, MMM d")}</span>
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
    </div>
  );
}

export default function RecurringList({ items, transactions }) {
  const list = useMemo(() => items ?? getRecurring(transactions || []), [items, transactions]);
  if (!list || list.length === 0) {
    return <p className="text-xs text-white/40 py-2">No recurring patterns detected yet — add 3+ consistent occurrences and they'll appear here.</p>;
  }
  return (
    <div className="space-y-1">
      {list.map((it) => <RecurringItem key={it.normalized} item={it} />)}
    </div>
  );
}