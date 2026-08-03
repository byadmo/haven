import React from "react";
import { differenceInMonths, format } from "date-fns";
import { computeTrajectory, solveExtraForTarget } from "@/lib/trajectory";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

export default function GoalPlanner({ debts, accounts, transactions, method, months, onApply, currentExtra }) {
  const today = new Date();
  const [target, setTarget] = React.useState("");

  const targetMonths = target ? Math.max(1, differenceInMonths(new Date(target), today)) : null;
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

  return (
    <div className="rounded-lg border border-white/10 bg-black p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 flex items-center justify-center bg-indigo-500/10">
          <Target className="h-3.5 w-3.5 text-indigo-400" />
        </div>
        <div>
          <h2 className="font-semibold text-sm text-zinc-100">Payoff Goal</h2>
          <p className="text-[10px] uppercase tracking-widest text-white/50">Set a target debt-free date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
        <div>
          <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Target Date</Label>
          <input
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-2 w-full h-9 rounded-md border border-white/10 bg-black px-3 text-sm text-zinc-100 font-mono tabular-nums"
          />
        </div>
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Required Extra / Month</p>
          <p className="mt-1 text-2xl font-mono tabular-nums text-indigo-400">
            {solved?.extra != null ? fmt(solved.extra) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Projected Debt-Free</p>
          <p className={`mt-1 text-2xl font-mono tabular-nums ${solved?.reached ? "text-emerald-400" : "text-rose-400"}`}>
            {goalFreeDate || (target ? "—" : "")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={solved?.extra == null}
          onClick={() => onApply(solved.extra)}
          className="bg-indigo-600 text-white hover:bg-indigo-500"
        >
          Apply to Projection
        </Button>
        {solved?.extra != null && currentExtra === solved.extra && (
          <span className="text-[10px] tracking-[0.18em] font-mono uppercase text-emerald-400">● Applied</span>
        )}
        {target && solved?.extra == null && (
          <span className="text-[10px] tracking-[0.18em] font-mono uppercase text-rose-400">Not reachable — extend horizon or date</span>
        )}
      </div>
    </div>
  );
}