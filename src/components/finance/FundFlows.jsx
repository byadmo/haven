import React from "react";
import { parseISO, format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";

function FlowRow({ t }) {
  const isIncome = t.type === "income";
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-zinc-800/70 last:border-0">
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
          isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"
        }`}
      >
        {isIncome ? <ArrowDownLeft className="h-4 w-4 text-emerald-400" /> : <ArrowUpRight className="h-4 w-4 text-rose-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">{t.description}</p>
        <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
          {t.category}
          {t.is_scheduled && (
            <span className="inline-flex items-center gap-0.5 text-zinc-500">
              · <CalendarClock className="h-2.5 w-2.5" /> {t.frequency}
            </span>
          )}
          <span>· {format(parseISO(t.date), "MMM d")}</span>
        </p>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
        {isIncome ? "+" : "-"}${t.amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
      </span>
    </div>
  );
}

export default function FundFlows({ transactions }) {
  const inflows = transactions.filter((t) => t.type === "income");
  const outflows = transactions.filter((t) => t.type === "expense").sort((a, b) => a.is_scheduled === b.is_scheduled ? 0 : a.is_scheduled ? -1 : 1);

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
          <div>{inflows.slice(0, 12).map((t) => <FlowRow key={t.id} t={t} />)}</div>
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
          <div>{outflows.slice(0, 12).map((t) => <FlowRow key={t.id} t={t} />)}</div>
        )}
      </div>
    </div>
  );
}