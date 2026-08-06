import React, { useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
  parseISO,
  addDays,
  addMonths,
  addYears,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { getRecurring, normalizeDesc } from "@/lib/recurring";
import { useCurrency } from "@/lib/currency-context";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const cfmt = (v) => "$" + Math.round(v || 0).toLocaleString();

// Roll a date forward/backward by one recurrence interval.
function stepBy(date, frequency, n) {
  if (frequency === "weekly") return addDays(date, 7 * n);
  if (frequency === "biweekly") return addDays(date, 14 * n);
  if (frequency === "monthly") return addMonths(date, n);
  if (frequency === "yearly") return addYears(date, n);
  return addDays(date, 30 * n);
}

// Enumerate a recurring pattern's occurrences that fall in [start, end],
// by walking the regular cadence both directions from the last known date.
function occurrencesInWindow(pattern, start, end) {
  const base = parseISO(pattern.last_date);
  const out = [];
  let cur = base;
  let guard = 0;
  while (cur <= end && guard < 5000) {
    if (cur >= start) out.push(format(cur, "yyyy-MM-dd"));
    cur = stepBy(cur, pattern.frequency, 1);
    guard++;
  }
  cur = stepBy(base, pattern.frequency, -1);
  guard = 0;
  while (cur >= start && guard < 5000) {
    if (cur <= end) out.push(format(cur, "yyyy-MM-dd"));
    cur = stepBy(cur, pattern.frequency, -1);
    guard++;
  }
  return out;
}

// Monthly calendar of projected income/expense per day. Fully client-side so
// the month is freely navigable and recurring income (payroll, etc.) is
// projected onto the days it actually lands — not just literal tx dates.
export default function CashFlowCalendar({ anchor, onAnchorChange }) {
  const { transactions, debts, accounts } = useFinanceData();
  const { fmtMoney } = useCurrency();

  const starting = useMemo(
    () => accounts.reduce((s, a) => s + (a.balance || 0), 0),
    [accounts]
  );

  const recurring = useMemo(() => getRecurring(transactions), [transactions]);
  const recurringKeys = useMemo(() => new Set(recurring.map((r) => r.normalized)), [recurring]);

  const monthMap = useMemo(() => {
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);
    const startKey = format(start, "yyyy-MM-dd");
    const endKey = format(end, "yyyy-MM-dd");
    const map = {};
    const add = (key, type, amt) => {
      if (!key) return;
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      const bucket = type === "income" ? "income" : "expense";
      map[key][bucket] += Math.abs(amt || 0);
    };

    // 1) Real transaction rows in this month — actuals, scheduled one-time
    //    items, and scheduled recurring bills. Only what genuinely exists;
    //    no invented future expenses are ever added here.
    const literalDatesByGroup = {};
    for (const t of transactions) {
      if (!t.date || t.date < startKey || t.date > endKey) continue;
      add(t.date, t.type, t.amount);
      const gk = `${t.type || "expense"}::${normalizeDesc(t.description)}`;
      if (recurringKeys.has(gk)) (literalDatesByGroup[gk] ||= new Set()).add(t.date);
    }

    // 2) Project recurring INCOME occurrences across the month so every
    //    paycheck lands on its day, deduped against rows already recorded.
    //    Expenses are never projected — only real rows + debt min-payments show.
    for (const p of recurring) {
      if (p.type !== "income") continue;
      const seen = literalDatesByGroup[p.normalized] || new Set();
      for (const key of occurrencesInWindow(p, start, end)) {
        if (seen.has(key)) continue;
        add(key, "income", p.average_amount);
      }
    }

    // 3) Upcoming minimum debt payments due this month.
    for (const d of debts || []) {
      if (d.status === "paid_off" || !d.due_date || !d.minimum_payment) continue;
      if (d.due_date < startKey || d.due_date > endKey) continue;
      add(d.due_date, "expense", d.minimum_payment);
    }

    for (const k in map) {
      map[k].income = Math.round(map[k].income * 100) / 100;
      map[k].expense = Math.round(map[k].expense * 100) / 100;
    }
    return map;
  }, [transactions, recurring, recurringKeys, debts, anchor]);

  const grid = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 }),
      }),
    [anchor]
  );

  const isCurrentMonth = isSameMonth(anchor, new Date());

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-[11px] uppercase tracking-widest text-white/50">Cash Flow Calendar</h2>
          <p className="text-xs text-white/40 mt-1 tabular-nums">Starting balance {fmtMoney(starting)}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] text-white/40 mr-1">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Income</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Expense</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAnchorChange(addMonths(anchor, -1))}
              className="h-7 w-7 grid place-items-center rounded-md border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/25 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-white/70 tabular-nums min-w-[7rem] text-center">
              {format(anchor, "MMMM yyyy")}
            </span>
            <button
              onClick={() => onAnchorChange(addMonths(anchor, 1))}
              className="h-7 w-7 grid place-items-center rounded-md border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/25 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => onAnchorChange(new Date())}
                className="ml-1 text-[10px] uppercase tracking-wider text-white/40 hover:text-white px-2 py-1 rounded-md border border-white/10 transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-l border-t border-white/10 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-r border-b border-white/10 px-2 py-1.5 text-[10px] uppercase tracking-wider text-white/40"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const row = monthMap[key];
            const inMonth = isSameMonth(day, anchor);
            const today = isToday(day);
            return (
              <div
                key={key}
                className={`relative border-r border-b border-white/10 min-h-[68px] p-1.5 flex flex-col gap-0.5 ${
                  inMonth ? "" : "opacity-25"
                } ${today ? "bg-white/[0.04]" : ""}`}
              >
                <span className={`text-[10px] tabular-nums ${today ? "text-emerald-300 font-semibold" : "text-white/40"}`}>
                  {format(day, "d")}
                </span>
                {row?.income > 0 && (
                  <span className="text-[10px] text-emerald-400 tabular-nums leading-tight">
                    +{cfmt(row.income)}
                  </span>
                )}
                {row?.expense > 0 && (
                  <span className="text-[10px] text-rose-400 tabular-nums leading-tight">
                    -{cfmt(row.expense)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}