import React, { useMemo, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getRecurring } from "@/lib/recurring";
import { RecurringItem } from "@/components/finance/RecurringList";

// Auto-detected recurring patterns with a "Re-run detection" button that
// invokes the detectRecurringTransactions backend function.
export default function RecurringPanel({ transactions, onChanged }) {
  const items = useMemo(() => getRecurring(transactions || []), [transactions]);
  const [running, setRunning] = useState(false);

  async function reRun() {
    setRunning(true);
    try {
      await base44.functions.invoke("detectRecurringTransactions", {});
      onChanged?.();
    } catch {
      /* ignore — toast handled upstream if needed */
    }
    setRunning(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h2 className="text-[11px] uppercase tracking-widest text-white/50">Recurring Transactions</h2>
          <p className="text-[11px] text-white/40 mt-0.5">auto-detected from your history</p>
        </div>
        <button
          onClick={reRun}
          disabled={running}
          className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/25 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Re-run detection
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-white/40 py-6 text-center">No recurring patterns detected yet.</p>
      ) : (
        <div className="space-y-1">
          {items.map((it) => (
            <RecurringItem key={it.normalized} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}