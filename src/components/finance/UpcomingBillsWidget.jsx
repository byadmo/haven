// Overview widget: next 3-5 upcoming recurring bills, pulled from the shared
// FinanceDataContext (same source as the Recurring Bills page). The whole card
// is clickable and links to the full Recurring Bills page.
import React from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ArrowRight, Receipt } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { useCurrency } from "@/lib/currency-context";
import { dayDiff, freqLabel, catStyle } from "@/lib/recurringBills";

export default function UpcomingBillsWidget() {
  const { recurringBills, loading } = useFinanceData();
  const { fmtMoney: fmt } = useCurrency();

  const upcoming = React.useMemo(() => {
    return (recurringBills || [])
      .filter((b) => b.is_active && b.ai_review_status !== "rejected")
      .map((b) => ({ b, dd: dayDiff(b.next_due_date) }))
      .filter((x) => x.dd != null && x.dd >= 0)
      .sort((a, c) => a.dd - c.dd)
      .slice(0, 5);
  }, [recurringBills]);

  const total = upcoming.reduce((s, x) => s + (x.b.amount || 0), 0);

  return (
    <Link to="/recurring-bills" className="block group h-full">
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 hover:border-emerald-400/40 transition-colors h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <CalendarClock className="h-3.5 w-3.5 text-emerald-300" />
            </div>
            <h2 className="font-semibold text-sm text-zinc-100">Upcoming &amp; Recurring</h2>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40 group-hover:text-emerald-300 transition-colors flex items-center gap-0.5">
            See all <ArrowRight className="h-3 w-3" />
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-white/30 py-2">Loading…</p>
        ) : upcoming.length > 0 ? (
          <>
            <div className="space-y-1.5">
              {upcoming.map(({ b, dd }) => (
                <div key={b.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-zinc-100 truncate">{b.name}</p>
                      {b.category && (
                        <span className={`text-[9px] px-1 py-0.5 rounded border ${catStyle(b.category)}`}>{b.category}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 font-mono tabular-nums mt-0.5">
                      {freqLabel(b.frequency)} · {b.next_due_date} · {dd === 0 ? "today" : `in ${dd}d`}
                    </p>
                  </div>
                  <span className={`text-xs font-mono tabular-nums shrink-0 ${dd <= 3 ? "text-rose-300" : dd <= 7 ? "text-amber-300" : "text-emerald-300"}`}>
                    {fmt(b.amount)}
                  </span>
                </div>
              ))}
            </div>
            {total > 0 && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Total due soon</p>
                <p className="text-sm font-mono tabular-nums text-zinc-100">{fmt(total)}</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-6">
            <Receipt className="h-6 w-6 text-white/15 mx-auto mb-2" />
            <p className="text-xs text-white/40">No upcoming bills — add some on the Bills page.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-[11px] text-emerald-300 group-hover:underline">
              Go to Bills <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}