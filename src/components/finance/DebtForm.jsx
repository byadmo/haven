import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function DebtForm({ onSaved }) {
  const [name, setName] = React.useState("");
  const [currentBalance, setCurrentBalance] = React.useState("");
  const [originalBalance, setOriginalBalance] = React.useState("");
  const [interestRate, setInterestRate] = React.useState("");
  const [minimumPayment, setMinimumPayment] = React.useState("");
  const [dueDate, setDueDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !currentBalance) return;
    setSaving(true);
    try {
      await base44.entities.Debt.create({
        name,
        current_balance: parseFloat(currentBalance),
        original_balance: parseFloat(originalBalance) || parseFloat(currentBalance),
        interest_rate: parseFloat(interestRate) || 0,
        minimum_payment: parseFloat(minimumPayment) || 0,
        due_date: dueDate,
        status: "active",
      });
      setName("");
      setCurrentBalance("");
      setOriginalBalance("");
      setInterestRate("");
      setMinimumPayment("");
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="dname">Debt Name</Label>
        <Input id="dname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Visa Card, Car Loan" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cb">Current Balance ($)</Label>
          <Input id="cb" type="number" step="0.01" min="0" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob">Original Balance ($)</Label>
          <Input id="ob" type="number" step="0.01" min="0" value={originalBalance} onChange={(e) => setOriginalBalance(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ir">Interest Rate (%)</Label>
          <Input id="ir" type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mp">Min. Payment ($)</Label>
          <Input id="mp" type="number" step="0.01" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ddue">Due Date</Label>
        <Input id="ddue" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <Button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 text-white">
        {saving ? "Saving..." : "Add Debt"}
      </Button>
    </form>
  );
}