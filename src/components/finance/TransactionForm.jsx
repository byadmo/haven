import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { adjustAccountBalance, txEffect } from "@/lib/accounts";

const CATEGORIES = [
  "Salary", "Rent", "Utilities", "Groceries", "Transport", "Dining",
  "Entertainment", "Healthcare", "Insurance", "Loan Payment", "Credit Card",
  "Other Income", "Other Expense",
];

export default function TransactionForm({ onSaved, accounts = [] }) {
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState("expense");
  const [category, setCategory] = React.useState("Other Expense");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [isScheduled, setIsScheduled] = React.useState(false);
  const [frequency, setFrequency] = React.useState("monthly");
  const [accountId, setAccountId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description || !amount) return;
    setSaving(true);
    try {
      await base44.entities.Transaction.create({
        description,
        amount: parseFloat(amount),
        type,
        category,
        date,
        is_scheduled: isScheduled,
        frequency: isScheduled ? frequency : "one_time",
        next_date: isScheduled ? date : undefined,
        account_id: accountId || undefined,
      });
      if (accountId) {
        await adjustAccountBalance(accountId, txEffect({ type, amount: parseFloat(amount) }));
      }
      setDescription("");
      setAmount("");
      setAccountId("");
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === "income" ? "default" : "outline"}
          className={type === "income" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          onClick={() => setType("income")}
        >
          Income
        </Button>
        <Button
          type="button"
          variant={type === "expense" ? "default" : "outline"}
          className={type === "expense" ? "bg-orange-600 hover:bg-orange-700 text-white" : ""}
          onClick={() => setType("expense")}
        >
          Expense
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="desc">Description</Label>
        <Input id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Paycheck, Rent, Groceries" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amt">Amount ($)</Label>
          <Input id="amt" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Account {type === "income" ? "(deposit into)" : "(pay from)"}</Label>
        <Select value={accountId} onValueChange={(v) => setAccountId(v)}>
          <SelectTrigger><SelectValue placeholder="No account" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>No account</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div>
          <Label htmlFor="sched" className="text-sm font-medium">Scheduled / Recurring</Label>
          <p className="text-xs text-muted-foreground">Mark if this repeats weekly or monthly</p>
        </div>
        <Switch id="sched" checked={isScheduled} onCheckedChange={setIsScheduled} />
      </div>

      {isScheduled && (
        <div className="space-y-1.5">
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800">
        {saving ? "Saving..." : "Add Transaction"}
      </Button>
    </form>
  );
}