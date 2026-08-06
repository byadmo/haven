import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { adjustTransferInOut } from "@/lib/accounts";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function DebtModal({ open, onOpenChange, accounts = [], onSaved }) {
  const { toast } = useToast();
  const [name, setName] = React.useState("");
  const [currentBalance, setCurrentBalance] = React.useState("");
  const [originalBalance, setOriginalBalance] = React.useState("");
  const [interestRate, setInterestRate] = React.useState("");
  const [interestType, setInterestType] = React.useState("APR");
  const [minimumPayment, setMinimumPayment] = React.useState("");
  const [dueDate, setDueDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [showInAccounts, setShowInAccounts] = React.useState(false);
  const [fromAccountId, setFromAccountId] = React.useState("");
  const [toAccountId, setToAccountId] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setCurrentBalance("");
      setOriginalBalance("");
      setInterestRate("");
      setInterestType("APR");
      setMinimumPayment("");
      setDueDate(format(new Date(), "yyyy-MM-dd"));
      setShowInAccounts(false);
      setFromAccountId("");
      setToAccountId("");
    }
  }, [open]);

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

      // If TO is set, the cash from this debt lands in that bank account (cash advance / loan disbursement)
      if (toAccountId) {
        await adjustTransferInOut(toAccountId, balance, "in");
      }
      // If FROM is set, funds were drawn from that bank account to cover this debt
      if (fromAccountId) {
        await adjustTransferInOut(fromAccountId, balance, "out");
      }

      onOpenChange?.(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} onOpenAutoFocus={(e) => e.preventDefault()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Add Liability</DialogTitle>
          <DialogDescription className="text-zinc-500">Add a debt to your ledger — Tab to move, Enter to save.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Current Balance</Label>
            <div className="mt-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-2xl font-bold text-zinc-600">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-8 pr-3 py-3 text-2xl font-bold tabular-nums text-zinc-50 outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Debt Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Visa Card, Car Loan"
              className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Original Balance ($)</Label>
              <Input type="number" step="0.01" min="0" value={originalBalance} onChange={(e) => setOriginalBalance(e.target.value)} placeholder="0.00" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
            </div>
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Min. Payment ($)</Label>
              <Input type="number" step="0.01" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} placeholder="0.00" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Interest Rate (%)</Label>
              <Input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0.00" className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
            </div>
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Interest Type</Label>
              <Select value={interestType} onValueChange={setInterestType}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"><SelectValue /></SelectTrigger>
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
          </div>

          <div>
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10" />
          </div>

          {/* FROM / TO fund flow */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-3 space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
              <ArrowRight className="h-3 w-3" /> Initial Fund Flow (optional)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">FROM Account</Label>
                <Select value={fromAccountId || "__none"} onValueChange={(v) => setFromAccountId(v === "__none" ? "" : v)}>
                  <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"><SelectValue placeholder="No account" /></SelectTrigger>
                  <SelectContent className="bg-black border-zinc-800">
                    <SelectItem value="__none">No account</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">TO Account</Label>
                <Select value={toAccountId || "__none"} onValueChange={(v) => setToAccountId(v === "__none" ? "" : v)}>
                  <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"><SelectValue placeholder="No account" /></SelectTrigger>
                  <SelectContent className="bg-black border-zinc-800">
                    <SelectItem value="__none">No account</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5">FROM deducts the opening balance from a bank account. TO receives the cash from a cash advance or loan disbursement.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Show on Accounts</Label>
              <p className="text-[10px] text-zinc-600 mt-0.5">Surface this debt in the Accounts section</p>
            </div>
            <Switch checked={showInAccounts} onCheckedChange={setShowInAccounts} />
          </div>

          <Button type="submit" disabled={saving || !name || !currentBalance} className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors">
            {saving ? "Saving…" : "Add Debt"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}