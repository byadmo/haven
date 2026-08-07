// Subscriptions Overview — clean table of every active recurring bill with the
// total monthly commitment and the required per-paycheque Bills Vault deposit.
import React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { freqLabel, catStyle } from "@/lib/recurringBills";
import { money } from "@/lib/paychequeAllocator";

function vaultName(vaults, id) {
  if (!id) return "—";
  const v = (vaults || []).find((x) => x.id === id);
  return v ? v.vault_name : "—";
}

export default function SubscriptionsOverviewCard({ bills, vaults, onAddBill, onEdit, onDelete, monthlyCommitment, perPaycheque }) {
  const active = (bills || []).filter((b) => b.is_active && b.ai_review_status !== "rejected");

  return (
    <section className="rounded-lg border border-white/10 bg-black p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-zinc-100">Subscriptions Overview</p>
        <Button size="sm" onClick={onAddBill} className="bg-emerald-500 text-white hover:bg-emerald-600">
          <Plus className="h-4 w-4 mr-1" /> Add Subscription
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded border border-white/10 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Total Monthly Recurring Commitment</p>
          <p className="text-xl font-mono tabular-nums text-zinc-100 mt-1">{money(monthlyCommitment)}</p>
        </div>
        <div className="rounded border border-emerald-400/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] uppercase tracking-widest text-emerald-300/70">Required per paycheque (Bills Vault)</p>
          <p className="text-xl font-mono tabular-nums text-emerald-300 mt-1">{money(perPaycheque)}</p>
        </div>
      </div>

      {active.length ? (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-white/40">
                <th className="font-medium py-1.5 pr-2">Name</th>
                <th className="font-medium py-1.5 pr-2 text-right">Amount</th>
                <th className="font-medium py-1.5 pr-2">Freq</th>
                <th className="font-medium py-1.5 pr-2">Due</th>
                <th className="font-medium py-1.5 pr-2">Category</th>
                <th className="font-medium py-1.5 pr-2">Vault</th>
                <th className="font-medium py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {active.map((b) => (
                <tr key={b.id} className="border-t border-white/5 text-xs">
                  <td className="py-1.5 pr-2 text-zinc-100 truncate max-w-[140px]">{b.name}</td>
                  <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-zinc-100">{money(b.amount)}</td>
                  <td className="py-1.5 pr-2 text-white/50">{freqLabel(b.frequency)}</td>
                  <td className="py-1.5 pr-2 text-white/50 font-mono tabular-nums">{b.due_day_of_month || (b.next_due_date ? Number(b.next_due_date.slice(8, 10)) : "—")}</td>
                  <td className="py-1.5 pr-2">
                    {b.category && <span className={`text-[9px] px-1 py-0.5 rounded border ${catStyle(b.category)}`}>{b.category}</span>}
                  </td>
                  <td className="py-1.5 pr-2 text-white/50 truncate max-w-[110px]">{vaultName(vaults, b.vault_id)}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    <button onClick={() => onEdit?.(b)} title="Edit" className="h-6 w-6 inline-grid place-items-center rounded border border-white/10 text-white/50 hover:text-white hover:border-white/30 mr-1"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => onDelete?.(b)} title="Delete" className="h-6 w-6 inline-grid place-items-center rounded border border-white/10 text-white/50 hover:text-rose-300 hover:border-rose-400/30"><Trash2 className="h-3 w-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-white/30 text-center py-4">No active recurring bills yet.</p>
      )}
    </section>
  );
}