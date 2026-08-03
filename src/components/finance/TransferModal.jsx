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
import { adjustTransferInOut } from "@/lib/accounts";
import { format } from "date-fns";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function TransferModal({ open, onOpenChange, accounts = [], debts = [], onSaved }) {
  const [fromId, setFromId] = React.useState("");
  const [toId, setToId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = React.useState(false);
  const amountRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setFromId("");
      setToId("");
      setAmount("");
      setDescription("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      const t = setTimeout(() => amountRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  const fromLabel =
    accounts.find((a) => a.id === fromId)?.name ||
    debts.find((d) => d.id === fromId)?.name ||
    "";
  const toLabel =
    accounts.find((a) => a.id === toId)?.name ||
    debts.find((d) => d.id === toId)?.name ||
    "";
  const dynamicDesc = `Transfer${fromLabel ? ` from ${fromLabel}` : ""}${toLabel ? ` to ${toLabel}` : ""}`;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fromId || !toId || !amount || fromId === toId) return;
    setSaving(true);
    try {
      const amt = parseFloat(amount);

      // Adjust both account balances
      await adjustTransferInOut(fromId, amt, "out");
      await adjustTransferInOut(toId, amt, "in");

      // Record a transaction for audit trail
      await base44.entities.Transaction.create({
        description: description || dynamicDesc,
        amount: amt,
        type: "expense",
        category: "Transfer",
        date,
        account_id: fromId,
        transfer_account_id: toId,
        is_scheduled: false,
        frequency: "one_time",
      });

      onOpenChange?.(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  const renderAccountOptions = () => (
    <>
      <SelectItem value="__none">No account</SelectItem>
      <SelectGroup>
        <SelectLabel className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1">Bank Accounts</SelectLabel>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectGroup>
      {debts.length > 0 && (
        <SelectGroup>
          <SelectLabel className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 py-1">Liabilities</SelectLabel>
          {debts.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
          ))}
        </SelectGroup>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange} onOpenAutoFocus={(e) => e.preventDefault()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Transfer Money</DialogTitle>
          <DialogDescription className="text-zinc-500">Move funds between accounts — chequing to liability pays it down, liability to chequing is a cash advance.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">FROM Account</Label>
              <Select value={fromId || "__none"} onValueChange={(v) => setFromId(v === "__none" ? "" : v)}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {renderAccountOptions()}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">TO Account</Label>
              <Select value={toId || "__none"} onValueChange={(v) => setToId(v === "__none" ? "" : v)}>
                <SelectTrigger className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {renderAccountOptions()}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={dynamicDesc}
                className="mt-1 bg-zinc-950 border-zinc-800 text-zinc-100 h-10"
              />
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
          </div>

          {fromId && toId && fromId !== toId && amount && (
            <p className="text-[10px] text-zinc-500 px-1">
              {fromLabel} → {toLabel}: {fmt(parseFloat(amount) || 0)}
            </p>
          )}

          <Button
            type="submit"
            disabled={saving || !amount || !fromId || !toId || fromId === toId}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            {saving ? "Transferring…" : "Transfer Now"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}