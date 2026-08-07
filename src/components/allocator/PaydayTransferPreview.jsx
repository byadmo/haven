// Pay Day Transfer Preview — mirrors the per-pay period automated transfers
// produced by the splitter, color-coded per vault, with a liquid-balance rollup
// and a verification line that should equal the paycheque amount.
import React from "react";
import { money } from "@/lib/paychequeAllocator";

function isLiquid(type) {
  return type === "Variable Need" || type === "Unallocated";
}

export default function PaydayTransferPreview({ items, income, cushion }) {
  const liquid = (items || []).filter((v) => isLiquid(v.allocation_type)).reduce((s, v) => s + Math.max(0, v.amount), 0);
  const over = cushion < 0;
  const total = (items || []).reduce((s, v) => s + Math.max(0, v.amount), 0);

  return (
    <section className="rounded-lg border border-white/10 bg-black p-4">
      <p className="text-sm font-semibold text-zinc-100 mb-3">Pay Day Transfer Preview</p>
      {over ? (
        <div className="mb-3 rounded border border-rose-400/30 bg-rose-500/5 p-2.5">
          <p className="text-xs text-rose-300">Over-allocated by {money(Math.abs(cushion))} — reduce vault targets so transfers don't exceed your paycheque.</p>
        </div>
      ) : null}
      <div className="space-y-1.5">
        {(items || []).filter((v) => v.allocation_type !== "Unallocated").map((v) => (
          <Row key={v.id} color={v.color} label={`${v.allocation_type === "Fixed Bill" ? "Auto-transfer to " : ""}${v.vault_name}`} amount={v.amount} bold={v.allocation_type === "Fixed Bill" || v.allocation_type === "Savings/Investment"} />
        ))}
        <Row color="#a1a1aa" label="Liquid available (variable + discretionary)" amount={liquid} />
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex items-baseline justify-between">
        <span className="text-[11px] text-white/50">Total transferred</span>
        <span className={`text-base font-mono tabular-nums ${Math.abs(total - income) < 0.01 ? "text-emerald-300" : "text-rose-300"}`}>
          {money(total)} = {money(income)}
        </span>
      </div>
    </section>
  );
}

function Row({ color, label, amount, bold }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className={`text-xs truncate ${bold ? "text-zinc-100 font-medium" : "text-white/70"}`}>{label}</span>
      </div>
      <span className={`text-xs font-mono tabular-nums ${bold ? "text-zinc-100" : "text-white/70"}`}>{money(amount)}</span>
    </div>
  );
}