import React from "react";
import { parseISO, isFuture, isToday } from "date-fns";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const THRESHOLD_KEY = "dd:cash-buffer-threshold";

export default function CashBuffer({ accounts, transactions }) {
  const [threshold, setThreshold] = React.useState(() => Number(localStorage.getItem(THRESHOLD_KEY)) || 500);

  React.useEffect(() => {
    localStorage.setItem(THRESHOLD_KEY, String(threshold));
  }, [threshold]);

  const balance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const upcoming = transactions
    .filter((t) => t.type === "expense" && (isFuture(parseISO(t.date)) || isToday(parseISO(t.date))))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const projected = balance - upcoming;
  const below = projected < threshold;

  return (
    <div
      className={`rounded-2xl border p-5 backdrop-blur-xl shadow-xl shadow-black/30 transition-colors ${
        below ? "border-rose-500/40 bg-rose-500/5" : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${below ? "bg-rose-500/15" : "bg-indigo-500/15"}`}>
          {below ? <ShieldAlert className="h-3.5 w-3.5 text-rose-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-indigo-300" />}
        </div>
        <h2 className="font-semibold text-sm text-zinc-100">Cash Buffer</h2>
      </div>

      {below && (
        <p className="text-[11px] text-rose-300 mb-3 leading-relaxed">
          Projected balance after upcoming expenses is below your buffer. Trim spending or top up your account.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">Balance</p>
          <p className="text-base font-bold text-zinc-50 tabular-nums">{fmt(balance)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">Upcoming</p>
          <p className="text-base font-bold text-rose-400 tabular-nums">-{fmt(upcoming)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400">Projected</p>
          <p className={`text-base font-bold tabular-nums ${below ? "text-rose-400" : "text-emerald-400"}`}>{fmt(projected)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="text-[11px] text-zinc-400 whitespace-nowrap">Buffer threshold</label>
        <Input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Math.max(0, Number(e.target.value) || 0))}
          className="h-8 bg-zinc-950 border-zinc-800 text-zinc-100 text-sm w-28 tabular-nums"
        />
      </div>
    </div>
  );
}