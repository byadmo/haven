import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { Loader2 } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const cfmt = (v) => "$" + Math.round(v || 0).toLocaleString();

// Monthly calendar of projected income/expense per day, with a running
// balance label. Data comes from the `getCashFlowCalendar` backend function
// (starting balance + per-day totals + crunch-day flag).
export default function CashFlowCalendar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { fmtMoney } = useCurrency();
  const anchor = new Date();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    base44.functions
      .invoke("getCashFlowCalendar", {})
      .then((res) => {
        if (!cancelled) setData(res?.data ?? res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byDate = useMemo(() => {
    const m = {};
    (data?.days || []).forEach((d) => {
      m[d.date] = d;
    });
    return m;
  }, [data]);

  const grid = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 }),
      }),
    // anchor is "now" — recompute only on mount.
     
    []
  );

  const starting = data?.starting_balance ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-white/50">Cash Flow Calendar</h2>
          <p className="text-xs text-white/40 mt-1 tabular-nums">Starting balance {fmtMoney(starting)}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Income</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Expense</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-4 w-4 animate-spin text-white/30" />
        </div>
      ) : (
        <div className="border-l border-t border-white/10 rounded-lg overflow-hidden">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((d) => (
              <div key={d} className="border-r border-b border-white/10 px-2 py-1.5 text-[10px] uppercase tracking-wider text-white/40">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const row = byDate[key];
              const inMonth = isSameMonth(day, anchor);
              const today = isToday(day);
              const crunch = row?.is_crunch_day;
              return (
                <div
                  key={key}
                  className={`relative border-r border-b border-white/10 min-h-[68px] p-1.5 flex flex-col gap-0.5 ${
                    inMonth ? "" : "opacity-25"
                  } ${today ? "bg-white/[0.04]" : ""} ${crunch ? "ring-1 ring-inset ring-rose-500/40" : ""}`}
                >
                  <span className={`text-[10px] tabular-nums ${today ? "text-emerald-300 font-semibold" : "text-white/40"}`}>
                    {format(day, "d")}
                  </span>
                  {row?.income > 0 && (
                    <span className="text-[10px] text-emerald-400 tabular-nums leading-tight">+{cfmt(row.income)}</span>
                  )}
                  {row?.expenses > 0 && (
                    <span className="text-[10px] text-rose-400 tabular-nums leading-tight">-{cfmt(row.expenses)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}