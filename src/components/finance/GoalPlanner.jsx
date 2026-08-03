import React from "react";
import { differenceInMonths, format } from "date-fns";
import { computeTrajectory, solveExtraForTarget } from "@/lib/trajectory";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Target, Calendar } from "lucide-react";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

export default function GoalPlanner({ debts, accounts, transactions, method, months, onApply, currentExtra }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [target, setTarget] = React.useState("");

  const targetMonths = target ? Math.max(1, differenceInMonths(new Date(target + 'T00:00:00'), today)) : null;
  const horizon = Math.max(months, targetMonths ?? months);

  const solved = React.useMemo(() => {
    if (targetMonths == null) return null;
    return solveExtraForTarget({ debts, accounts, transactions, method, months: horizon, targetMonths });
  }, [debts, accounts, transactions, method, horizon, targetMonths]);

  const goalSeries = solved?.extra != null
    ? computeTrajectory({ debts, accounts, transactions, months: horizon, method, extraPayment: solved.extra }).series
    : null;
  const goalFreeMonth = goalSeries?.find((p) => p.debtRemaining <= 0.005)?.month;
  const goalFreeDate = goalFreeMonth != null ? format(goalSeries[goalFreeMonth].date, "MMM yyyy") : null;

  // Earliest possible debt-free date: pay nothing extra, just minimums + monthly surplus from recurring income/expenses
  const earliestTraj = React.useMemo(
    () => computeTrajectory({ debts, accounts, transactions, months: 120, method, extraPayment: 0 }),
    [debts, accounts, transactions, method]
  );
  const earliestFreeMonth = earliestTraj.series.findIndex((p) => p.debtRemaining <= 0.005);
  const earliestDate = earliestFreeMonth >= 0 ? format(earliestTraj.series[earliestFreeMonth].date, "MMM yyyy") : null;
  const monthlySurplus = earliestTraj.series[0]?.monthlyNet || 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 flex items-center justify-center bg-indigo-500/10">
          <Target className="h-3.5 w-3.5 text-indigo-400" />
        </div>
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">Set a Payoff Goal</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Pick a date — we'll calculate the extra payment needed</p>
        </div>
      </div>

      {/* Earliest possible date */}
      <button
        onClick={() => {
          if (earliestFreeMonth >= 0) {
            const d = earliestTraj.series[earliestFreeMonth].date;
            setTarget(format(d, "yyyy-MM-dd"));
          }
        }}
        className="mt-3 w-full text-left p-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors cursor-pointer flex flex-wrap items-center gap-x-6 gap-y-2"
      >
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Earliest Possible · Click to Set as Goal</p>
          <p className="text-xl font-mono tabular-nums text-emerald-400">{earliestDate || "10+ years"}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono">Surplus</span>
            <p className="font-mono tabular-nums text-zinc-200">{fmt(monthlySurplus)}<span className="text-xs text-white/40">/mo</span></p>
          </div>
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed flex-1 min-w-[200px]">
          Fastest payoff with your current income and expenses — no extra payments needed. Click to set this as your goal.
        </p>
      </button>

      <div className="mt-4">
        <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">When do you want to be debt-free?</Label>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-2">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="h-4 w-4 text-white/40 shrink-0" />
            <input
              type="date"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full h-9 rounded-md border border-white/10 bg-black px-3 text-sm text-zinc-100 font-mono tabular-nums"
            />
          </div>

          {solved?.extra != null && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono mb-1">Extra needed</p>
                <p className="text-2xl font-mono tabular-nums text-indigo-400">
                  {fmt(solved.extra)}<span className="text-xs text-white/40">/mo</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono mb-1">Debt-free by</p>
                <p className={`text-2xl font-mono tabular-nums ${solved?.reached ? "text-emerald-400" : "text-rose-400"}`}>
                  {goalFreeDate || "—"}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => onApply(solved.extra)}
                className="bg-indigo-600 text-white hover:bg-indigo-500 mb-1"
              >
                Apply
              </Button>
            </div>
          )}
        </div>

        {target && solved?.extra == null && (
          <p className="text-[10px] tracking-[0.18em] font-mono uppercase text-rose-400 mt-2">
            Not reachable with current income — try a later date
          </p>
        )}
        {solved?.extra != null && currentExtra === solved.extra && (
          <p className="text-[10px] tracking-[0.18em] font-mono uppercase text-emerald-400 mt-2">
            ✓ Applied to your projection below
          </p>
        )}
      </div>
    </div>
  );
}