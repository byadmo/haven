import React from "react";
import { parseISO, format, isFuture, isToday } from "date-fns";
import { CalendarClock, Repeat } from "lucide-react";

const fmt = (v) => (v || 0).toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function UpcomingRecurring({ transactions, accounts = [] }) {
  const accountsMap = React.useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const upcoming = transactions
    .filter((t) => (t.is_scheduled || isFuture(parseISO(t.date)) || isToday(parseISO(t.date))))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 8);

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

      {upcoming.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-8">No scheduled or upcoming items.</p>
      ) : (
        <div className="space-y-1">
          {upcoming.map((t) => {
            const isIncome = t.type === "income";
            const due = parseISO(t.date);
            return (
              <div key={t.id} className="flex items-center gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
                <div className={`h-6 w-6 rounded-md flex items-center justify-center ${isIncome ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                  {t.is_scheduled ? <Repeat className={`h-3 w-3 ${isIncome ? "text-emerald-400" : "text-rose-400"}`} /> : <CalendarClock className={`h-3 w-3 ${isIncome ? "text-emerald-400" : "text-rose-400"}`} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200 truncate">{t.description}</p>
                  <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                    {format(due, "EEE, MMM d")}
                    {t.is_scheduled && <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider text-[9px]">{t.frequency}</span>}
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-rose-400"}`}>
                  {isIncome ? "+" : "-"}{fmt(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}