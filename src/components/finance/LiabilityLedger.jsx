import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { interestBreakdown } from "@/lib/debtStrategy";
import { Pencil, Trash2 } from "lucide-react";

export default function LiabilityLedger({ debts, onChanged }) {
  const [editing, setEditing] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Debt.update(editing.id, {
        current_balance: parseFloat(editing.current_balance) || 0,
        interest_rate: parseFloat(editing.interest_rate) || 0,
        minimum_payment: parseFloat(editing.minimum_payment) || 0,
        status: parseFloat(editing.current_balance) <= 0 ? "paid_off" : "active",
      });
      setEditing(null);
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await base44.entities.Debt.delete(id);
    onChanged?.();
  }

  if (!debts?.length) {
    return (
      <p className="text-sm text-zinc-500 text-center py-10">No liabilities tracked yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {debts.map((d) => {
        const { interest, principal } = interestBreakdown(d);
        const min = d.minimum_payment || 0;
        const isPaid = d.status === "paid_off" || (d.current_balance || 0) <= 0;
        const interestPct = min > 0 ? Math.min(100, (interest / min) * 100) : 0;
        const principalPct = 100 - interestPct;

        return (
          <div
            key={d.id}
            className={`rounded-2xl border p-4 backdrop-blur-xl shadow-lg shadow-black/30 transition-all ${
              isPaid ? "border-emerald-500/30 bg-emerald-500/5" : "border-zinc-800 bg-zinc-900/60"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm text-zinc-100">{d.name}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {isPaid ? "Paid off" : "Active liability"}
                </p>
              </div>
              {d.interest_rate > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-medium tabular-nums border border-rose-500/20">
                  {d.interest_rate}% APR
                </span>
              )}
            </div>

            <p className="text-2xl font-bold text-zinc-50 tabular-nums mb-3">
              ${(d.current_balance || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
            </p>

            {min > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5">Min. payment breakdown</p>
                <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                  <div className="bg-rose-500/70" style={{ width: `${interestPct}%` }} title="Interest" />
                  <div className="bg-emerald-500/70" style={{ width: `${principalPct}%` }} title="Principal" />
                </div>
                <div className="flex justify-between text-[10px] mt-1.5">
                  <span className="text-rose-300/80 tabular-nums">Interest ${interest.toFixed(2)}</span>
                  <span className="text-emerald-300/80 tabular-nums">Principal ${principal.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex-1">
                    <Pencil className="h-3 w-3 mr-1.5" /> Edit Terms
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle className="text-zinc-100">Edit {d.name}</DialogTitle>
                    <DialogDescription className="text-zinc-500">Update balance, APR, or minimum payment.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={saveEdit} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400">Current Balance ($)</Label>
                      <Input type="number" step="0.01" defaultValue={d.current_balance} onChange={(e) => setEditing({ ...d, current_balance: e.target.value })} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-zinc-400">APR (%)</Label>
                        <Input type="number" step="0.01" defaultValue={d.interest_rate} onChange={(e) => setEditing((prev) => ({ ...prev, interest_rate: e.target.value }))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-zinc-400">Min. Payment ($)</Label>
                        <Input type="number" step="0.01" defaultValue={d.minimum_payment} onChange={(e) => setEditing((prev) => ({ ...prev, minimum_payment: e.target.value }))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                      </div>
                    </div>
                    <DialogFooter className="pt-2">
                      <DialogClose asChild>
                        <Button type="button" variant="outline" className="border-zinc-800 text-zinc-400 hover:bg-zinc-800">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={saving} className="bg-zinc-100 text-zinc-900 hover:bg-white">
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" onClick={() => remove(d.id)} className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}