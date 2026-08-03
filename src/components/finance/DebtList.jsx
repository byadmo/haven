import React from "react";
import { base44 } from "@/api/base44Client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DebtList({ debts, onChanged }) {
  const [editing, setEditing] = React.useState(null);
  const [payValue, setPayValue] = React.useState("");

  async function deleteDebt(id) {
    await base44.entities.Debt.delete(id);
    onChanged?.();
  }

  async function applyPayment(debt) {
    const amt = parseFloat(payValue) || 0;
    if (amt <= 0) return;
    const newBal = Math.max(0, (debt.current_balance || 0) - amt);
    await base44.entities.Debt.update(debt.id, {
      current_balance: newBal,
      status: newBal === 0 ? "paid_off" : "active",
    });
    setPayValue("");
    setEditing(null);
    onChanged?.();
  }

  if (!debts?.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">No debts tracked yet. Add one above.</p>;
  }

  const total = debts.reduce((s, d) => s + (d.current_balance || 0), 0);

  return (
    <div className="space-y-3">
      {debts.map((d) => {
        const pct = d.original_balance > 0 ? Math.round((1 - d.current_balance / d.original_balance) * 100) : 0;
        const isPaid = d.status === "paid_off" || d.current_balance <= 0;
        return (
          <div key={d.id} className="rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.interest_rate ? `${d.interest_rate}% APR · ` : ""}
                  {d.minimum_payment ? `Min $${d.minimum_payment}` : ""}
                  {isPaid ? " · Paid off 🎉" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{`$${(d.current_balance || 0).toLocaleString()}`}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteDebt(d.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: isPaid ? "#22c55e" : "linear-gradient(90deg, #f97316, #ef4444)",
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{pct}% paid off of ${d.original_balance?.toLocaleString() || 0}</p>
            {!isPaid && (
              <div className="flex gap-2 pt-1">
                <Input
                  className="h-8 text-sm"
                  type="number"
                  step="0.01"
                  placeholder="Payment amount"
                  value={editing === d.id ? payValue : ""}
                  onChange={(e) => { setEditing(d.id); setPayValue(e.target.value); }}
                />
                <Button size="sm" variant="outline" onClick={() => applyPayment(d)}>Apply</Button>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-between pt-2 border-t border-border">
        <span className="font-semibold text-sm">Total Debt</span>
        <span className="font-bold text-red-600 text-sm">${total.toLocaleString()}</span>
      </div>
    </div>
  );
}