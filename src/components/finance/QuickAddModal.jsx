import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { adjustLinkedBalance, txEffect, balanceApplies } from "@/lib/accounts";
import { format } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import RecurringFields from "@/components/finance/RecurringFields";
import { useCategories, categoryOptions } from "@/lib/categories";

export default function QuickAddModal({ open, onOpenChange, accounts = [], debts = [], onSaved }) {
  const { categories } = useCategories();
  const options = categoryOptions(categories);
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState("expense");
  const [category, setCategory] = React.useState("Other");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [accountId, setAccountId] = React.useState("");
  const [recurring, setRecurring] = React.useState(false);
  const [frequency, setFrequency] = React.useState("monthly");
  const [nextDate, setNextDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [customInterval, setCustomInterval] = React.useState("1");
  const [customUnit, setCustomUnit] = React.useState("weeks");
  const [saving, setSaving] = React.useState(false);
  const amountRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setDescription("");
      setAmount("");
      setType("expense");
      setCategory("Other");
      setDate(format(new Date(), "yyyy-MM-dd"));
      setAccountId("");
      setRecurring(false);
      setFrequency("monthly");
      setNextDate(format(new Date(), "yyyy-MM-dd"));
      setCustomInterval("1");
      setCustomUnit("weeks");
      const t = setTimeout(() => amountRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

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
        account_id: accountId || undefined,
        is_scheduled: recurring,
        frequency: recurring ? frequency : "one_time",
        next_date: recurring ? (nextDate || date) : undefined,
        custom_interval: recurring && frequency === "custom" ? (parseInt(customInterval) || 1) : undefined,
        custom_unit: recurring && frequency === "custom" ? customUnit : undefined,
      });
      if (accountId && balanceApplies(date)) await adjustLinkedBalance(accountId, txEffect({ type, amount: parseFloat(amount) }));
      onOpenChange?.(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Quick Add</DialogTitle>
          <DialogDescription className="text-zinc-500">Log a transaction in seconds — Tab to move, Enter to save.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4" onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {/* allow submit */} }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("income")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium border transition-all ${
                type === "income"
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <TrendingUp className="h-4 w-4" /> Income
            </button>
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium border transition-all ${
                type === "expense"
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                  : "border-zinc-800 bg-zinc-950/60 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <TrendingDown className="h-4 w-4" /> Expense
            </button>
          </div>

          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Amount</Label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-600">$</span>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-3 text-2xl font-bold tabular-nums text-zinc-50 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Paycheck, Rent"
              className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {options.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">{type === "income" ? "Into account" : "From account"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"><SelectValue placeholder="No account" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value={null}>No account</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  {debts.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1">Liabilities</SelectLabel>
                      {debts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
            />
          </div>

          <RecurringFields
            scheduled={recurring}
            onScheduledChange={setRecurring}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            nextDate={nextDate}
            onNextDateChange={setNextDate}
            customInterval={customInterval}
            onCustomIntervalChange={setCustomInterval}
            customUnit={customUnit}
            onCustomUnitChange={setCustomUnit}
          />

          <Button
            type="submit"
            disabled={saving || !amount || !description}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            {saving ? "Saving…" : "Save Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}