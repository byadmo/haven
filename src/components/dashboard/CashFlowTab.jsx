import React, { useEffect, useState } from "react";
import { invokeFunc, money, pct, moneyCompact } from "@/lib/dashboard";
import { Loader, Card3 } from "@/components/dashboard/ui";
import { Calendar, RefreshCw, Repeat, Activity } from "lucide-react";
import RecurringList from "@/components/finance/RecurringList";

export default function CashFlowTab({ refreshKey, transactions = [], onRefresh }) {
  const [cal, setCal] = useState(null);
  const [adapt, setAdapt] = useState(null);
  const [recurringLoading, setRecurringLoading] = useState(false);

  async function loadCalendar() { invokeFunc("getCashFlowCalendar", {}).then(setCal).catch(() => {}); }
  async function loadAdapt() { invokeFunc("adaptVariableIncome", {}).then(setAdapt).catch(() => {}); }

  useEffect(() => {
    loadCalendar();
    loadAdapt();
  }, [refreshKey]);

  async function runDetection() {
    setRecurringLoading(true);
    await invokeFunc("detectRecurringTransactions", {}).catch(() => {});
    setRecurringLoading(false);
    onRefresh?.();
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = {};
  if (cal) for (const d of cal.days) byDate[d.date] = d;

  return (
    <div className="space-y-4">
      <Card3 title="Cash Flow Calendar" subtitle={`Starting balance ${cal ? money(cal.starting_balance) : "—"}`}>
        {!cal ? <Loader /> : (
          <div>
            <div className="grid grid-cols-7 gap-1 text-[10px] text-white/40 font-mono mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="text-center">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDow }).map((_, i) => <div key={`b${i}`} className="aspect-square rounded bg-white/[0.02]" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const d = byDate[key];
                const crunch = d?.is_crunch_day;
                const hasTxn = d && (d.income > 0 || d.expenses > 0);
                return (
                  <div key={key}
                    className={`aspect-square rounded border p-[5px] text-[8px] sm:text-[9px] font-mono tabular-nums leading-tight flex flex-col gap-1 overflow-hidden ${
                      crunch
                        ? "border-rose-500/60 bg-rose-500/10"
                        : hasTxn
                        ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                        : "border-white/[0.06] bg-white/[0.02]"
                    }`}>
                    <span className="text-white/35 self-start">{day}</span>
                    {hasTxn && (
                      <div className="flex flex-col gap-[2px] overflow-hidden">
                        {d.income > 0 && (
                          <span className="text-emerald-400 font-semibold whitespace-nowrap truncate" title={`+${money(d.income)}`}>+{moneyCompact(d.income)}</span>
                        )}
                        {d.expenses > 0 && (
                          <span className="text-rose-400 font-semibold whitespace-nowrap truncate" title={`-${money(d.expenses)}`}>-{moneyCompact(d.expenses)}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {cal.crunch_days.length > 0 && (
              <p className="text-[11px] text-rose-400 mt-2">⚠ {cal.crunch_days.length} crunch day(s) where balance goes negative: {cal.crunch_days.map((d) => d.date).join(", ")}</p>
            )}
          </div>
        )}
      </Card3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card3 title="Recurring Transactions" subtitle="Auto-detected from your history">
          <button onClick={runDetection} disabled={recurringLoading}
            className="mb-3 text-[11px] flex items-center gap-1 text-white/60 hover:text-white border border-white/10 rounded px-2 py-1">
            <RefreshCw className={`h-3 w-3 ${recurringLoading ? "animate-spin" : ""}`} /> Re-run detection
          </button>
          <RecurringList transactions={transactions} />
        </Card3>

        <Card3 title="Variable Income Adaptation">
          {!adapt ? <Loader /> : (
            <div className="space-y-2">
              <Row label="Baseline (3mo min)" value={money(adapt.baseline_income)} />
              <Row label="Current month income" value={money(adapt.current_month_income)} accent={adapt.surplus_detected ? "emerald" : "white"} />
              {adapt.surplus_detected ? (
                <>
                  <Row label="Surplus detected" value={money(adapt.surplus)} accent="emerald" />
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 mt-2">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-400/70 mb-1">Allocated</p>
                    <Row label="→ Emergency buffer" value={money(adapt.allocation.emergency_buffer)} />
                    <Row label="→ Waterfall (toxic debt)" value={money(adapt.allocation.waterfall_toxic)} />
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-white/50">No surplus above baseline this month — stay the course.</p>
              )}
            </div>
          )}
        </Card3>
      </div>
    </div>
  );
}

function Row({ label, value, accent = "white" }) {
  const c = accent === "emerald" ? "text-emerald-400" : "text-white";
  return (
    <div className="flex justify-between">
      <span className="text-[11px] text-white/50">{label}</span>
      <span className={`text-xs font-mono tabular-nums whitespace-nowrap ${c}`}>{value}</span>
    </div>
  );
}