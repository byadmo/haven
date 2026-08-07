// Add / edit modal for a recurring bill. Used by the RecurringBills page.
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { BILL_CATEGORIES, FREQ_OPTIONS } from "@/lib/recurringBills";

function blank() {
  return {
    name: "", amount: "", frequency: "monthly", custom_interval_days: "",
    next_due_date: new Date().toISOString().slice(0, 10),
    category: "Other", payment_account_id: "",
    is_auto_pay: false, is_active: true, notes: "",
  };
}

export default function RecurringBillForm({ open, onOpenChange, bill, accounts, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(bill ? { ...blank(), ...bill } : blank());
  }, [open, bill]);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!form.name || form.amount === "" || !form.next_due_date) {
      toast({ title: "Name, amount, and due date are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      amount: Number(form.amount),
      frequency: form.frequency,
      custom_interval_days: form.frequency === "custom" ? Number(form.custom_interval_days || 1) : null,
      next_due_date: form.next_due_date,
      category: form.category,
      payment_account_id: form.payment_account_id || null,
      is_auto_pay: !!form.is_auto_pay,
      is_active: form.is_active !== false,
      notes: form.notes || null,
      // preserve AI flags/notes when editing an AI-detected bill
      ...(bill ? { is_ai_detected: bill.is_ai_detected, ai_review_status: bill.ai_review_status } : {}),
    };
    try {
      if (bill?.id) {
        await base44.entities.RecurringBill.update(bill.id, payload);
        toast({ title: "Bill updated" });
      } else {
        await base44.entities.RecurringBill.create(payload);
        toast({ title: "Bill added" });
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast({ title: "Couldn't save bill", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{bill ? "Edit Recurring Bill" : "Add Recurring Bill"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
          <Field label="Name / Description"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Spotify, Rent, Car Loan" /></Field>
          <Field label="Amount ($)"><Input type="number" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="9.99" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQ_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Next due date"><Input type="date" value={form.next_due_date} onChange={(e) => set("next_due_date", e.target.value)} /></Field>
          </div>
          {form.frequency === "custom" && (
            <Field label="Custom interval (days)"><Input type="number" value={form.custom_interval_days} onChange={(e) => set("custom_interval_days", e.target.value)} placeholder="30" /></Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Payment account">
              <Select value={form.payment_account_id || "__none__"} onValueChange={(v) => set("payment_account_id", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not set —</SelectItem>
                  {(accounts || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
            <span className="text-xs text-white/70">Auto-pay</span>
            <Switch checked={!!form.is_auto_pay} onCheckedChange={(v) => set("is_auto_pay", v)} />
          </div>
          <div className="flex items-center justify-between rounded border border-white/10 px-3 py-2">
            <span className="text-xs text-white/70">Active</span>
            <Switch checked={form.is_active !== false} onCheckedChange={(v) => set("is_active", v)} />
          </div>
          <Field label="Notes"><Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Optional notes" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/70 hover:text-white hover:border-white/30">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-emerald-500 text-white hover:bg-emerald-600">{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-[11px] text-white/50 mb-1 block">{label}</Label>
      {children}
    </div>
  );
}