// Add Vault modal — name, allocation type, target amount, and color picker.
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { ALLOCATION_TYPES, ALLOCATION_TYPE_LABELS, VAULT_COLOR_PALETTE } from "@/lib/paychequeAllocator";

function blank(order) {
  return {
    vault_name: "",
    allocation_type: "Variable Need",
    target_allocation: "",
    color: VAULT_COLOR_PALETTE[5],
    display_order: order ?? 99,
  };
}

export default function AddVaultModal({ open, onOpenChange, nextOrder, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(blank(nextOrder));
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(blank(nextOrder)); }, [open, nextOrder]);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!form.vault_name) { toast({ title: "Vault name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await base44.entities.AllocationVault.create({
        vault_name: form.vault_name,
        allocation_type: form.allocation_type,
        target_allocation: Number(form.target_allocation) || 0,
        current_balance: 0,
        color: form.color,
        is_active: true,
        display_order: form.display_order,
      });
      toast({ title: "Vault added" });
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast({ title: "Couldn't add vault", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Vault</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] text-white/50 mb-1 block">Vault name</Label>
            <Input value={form.vault_name} onChange={(e) => set("vault_name", e.target.value)} placeholder="e.g. Vacation Fund, Emergency Fund" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">Allocation type</Label>
              <Select value={form.allocation_type} onValueChange={(v) => set("allocation_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALLOCATION_TYPES.map((t) => <SelectItem key={t} value={t}>{ALLOCATION_TYPE_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">Target amount ($)</Label>
              <Input type="number" step="0.01" value={form.target_allocation} onChange={(e) => set("target_allocation", e.target.value)} placeholder="0.00" className="font-mono tabular-nums" disabled={form.allocation_type === "Fixed Bill" || form.allocation_type === "Unallocated"} />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-white/50 mb-1 block">Color</Label>
            <div className="flex flex-wrap gap-2">
              {VAULT_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${form.color === c ? "scale-110 border-white" : "border-white/10"}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/70 hover:text-white hover:border-white/30">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-500 text-white hover:bg-emerald-600">{saving ? "Saving…" : "Add Vault"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}