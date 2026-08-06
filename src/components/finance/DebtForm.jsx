import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function DebtForm({ onSaved }) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [currentBalance, setCurrentBalance] = React.useState("");
  const [originalBalance, setOriginalBalance] = React.useState("");
  const [interestRate, setInterestRate] = React.useState("");
  const [interestType, setInterestType] = React.useState("APR");
  const [minimumPayment, setMinimumPayment] = React.useState("");
  const [dueDate, setDueDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [showInAccounts, setShowInAccounts] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !currentBalance) return;
    const balance = parseFloat(currentBalance);
    // B10 — prevent an exact duplicate liability (same name AND same balance).
    try {
      const existing = await base44.entities.Debt.list("-created_date").catch(() => []);
      if (existing.some((d) => d.name.trim().toLowerCase() === name.trim().toLowerCase() && Math.abs((d.current_balance || 0) - balance) < 0.005)) {
        toast({ title: "Liability already exists", description: `A liability named "${name.trim()}" with that balance already exists.`, variant: "destructive" });
        return;
      }
    } catch {}
    setSaving(true);
    try {
      await base44.entities.Debt.create({
        name,
        current_balance: balance,
        original_balance: parseFloat(originalBalance) || balance,
        interest_rate: parseFloat(interestRate) || 0,
        interest_type: interestType,
        minimum_payment: parseFloat(minimumPayment) || 0,
        due_date: dueDate,
        status: "active",
        show_in_accounts: showInAccounts,
      });
      setName("");
      setCurrentBalance("");
      setOriginalBalance("");
      setInterestRate("");
      setInterestType("APR");
      setMinimumPayment("");
      setShowInAccounts(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="dname" className="text-[11px] text-zinc-500 uppercase tracking-wider">Debt Name</Label>
        <Input id="dname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Visa Card, Car Loan" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="cb" className="text-[11px] text-zinc-500 uppercase tracking-wider">Current Balance ($)</Label>
          <Input id="cb" type="number" step="0.01" min="0" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} placeholder="0.00" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
        </div>
        <div>
          <Label htmlFor="ob" className="text-[11px] text-zinc-500 uppercase tracking-wider">Original Balance ($)</Label>
          <Input id="ob" type="number" step="0.01" min="0" value={originalBalance} onChange={(e) => setOriginalBalance(e.target.value)} placeholder="0.00" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="ir" className="text-[11px] text-zinc-500 uppercase tracking-wider">Interest Rate (%)</Label>
          <Input id="ir" type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0.00" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
        </div>
        <div>
          <Label htmlFor="mp" className="text-[11px] text-zinc-500 uppercase tracking-wider">Min. Payment ($)</Label>
          <Input id="mp" type="number" step="0.01" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} placeholder="0.00" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
        </div>
      </div>
      <div>
        <Label htmlFor="itype" className="text-[11px] text-zinc-500 uppercase tracking-wider">Interest Type</Label>
        <Select value={interestType} onValueChange={setInterestType}>
          <SelectTrigger id="itype" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black border-zinc-800">
            <SelectItem value="APR">APR</SelectItem>
            <SelectItem value="Fixed">Fixed Rate</SelectItem>
            <SelectItem value="Variable">Variable Rate</SelectItem>
            <SelectItem value="Simple">Simple Interest</SelectItem>
            <SelectItem value="Compound">Compound Interest</SelectItem>
            <SelectItem value="None">Interest-Free</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="ddue" className="text-[11px] text-zinc-500 uppercase tracking-wider">Due Date</Label>
        <Input id="ddue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
        <div>
          <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Show on Accounts</Label>
          <p className="text-[10px] text-zinc-600 mt-0.5">Surface this debt in the Accounts section</p>
        </div>
        <Switch checked={showInAccounts} onCheckedChange={setShowInAccounts} />
      </div>
      <Button type="submit" disabled={saving} className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors">
        {saving ? "Saving…" : "Add Debt"}
      </Button>
    </form>
  );
}