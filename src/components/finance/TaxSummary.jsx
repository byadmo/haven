import React, { useMemo } from "react";
import { Receipt, Info } from "lucide-react";

export default function TaxSummary({ transactions }) {
  const now = new Date();
  const yStart = new Date(now.getFullYear(), 0, 1);

  const yearTxs = useMemo(
    () => (transactions || []).filter(
      (t) => t.is_tax_deductible && t.date && new Date(t.date + "T00:00:00") >= yStart
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions]
  );

  const total = yearTxs.reduce((s, t) => s + (t.amount || 0), 0);

  const byCat = useMemo(() => {
    const m = new Map();
    yearTxs.forEach((t) => {
      const k = t.category || "Uncategorized";
      m.set(k, (m.get(k) || 0) + (t.amount || 0));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [yearTxs]);

  const lastDate = yearTxs.map((t) => t.date).sort().pop();

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">Tax Deductible · {now.getFullYear()}</p>
      </div>
      <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">${total.toFixed(2)}</p>
      <p className="text-[11px] text-white/40 mt-1">{yearTxs.length} tracked{lastDate ? ` · last ${lastDate}` : ""}</p>

      {byCat.length > 0 && (
        <div className="mt-3 space-y-1">
          {byCat.slice(0, 5).map(([name, v]) => (
            <div key={name} className="flex items-center justify-between text-[11px]">
              <span className="text-white/60 truncate">{name}</span>
              <span className="font-mono tabular-nums text-zinc-100">${v.toFixed(0)}</span>
            </div>
          ))}
          {byCat.length > 5 && (
            <p className="text-[10px] text-white/30 pt-1">+ {byCat.length - 5} more</p>
          )}
        </div>
      )}

      <p className="text-[10px] text-white/30 mt-3 flex items-start gap-1 border-t border-white/5 pt-2 leading-snug">
        <Info className="h-3 w-3 mt-0.5 shrink-0" /> Track these for tax season — consult your tax professional.
      </p>
    </div>
  );
}