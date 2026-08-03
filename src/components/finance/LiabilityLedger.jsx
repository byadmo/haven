import React from "react";
import { base44 } from "@/api/base44Client";
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
import { Plus, CreditCard, Trash2, ChevronDown } from "lucide-react";
import { interestBreakdown } from "@/lib/debtStrategy";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

const TIER_META = {
  entry: { label: "10% Down", icon: "🌱", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  midway: { label: "Halfway", icon: "⚡", className: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  mastery: { label: "Paid Off!", icon: "🏆", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
};

function getMilestone(d) {
  const orig = d.original_balance || 0;
  const cur = d.current_balance || 0;
  const pct = orig > 0 ? Math.min(100, Math.max(0, ((orig - cur) / orig) * 100)) : 0;
  let tier = null;
  if (cur <= 0.005) tier = "mastery";
  else if (pct >= 50) tier = "midway";
  else if (pct >= 10) tier = "entry";
  return { pct, tier };
}

export default function LiabilityLedger({ debts, onChanged }) {
  const [editing, setEditing] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [payments, setPayments] = React.useState([]);
  const [paying, setPaying] = React.useState(null);
  const [logging, setLogging] = React.useState(false);
  const [expanded, setExpanded] = React.useState({});

  React.useEffect(() => {
    base44.entities.DebtPayment.list("-date", 500).then(setPayments).catch(() => {});
  }, [debts]);

  const paymentsByDebt = React.useMemo(() => {
    const map = {};
    payments.forEach((p) => {
      (map[p.debt_id] = map[p.debt_id] || []).push(p);
    });
    return map;
  }, [payments]);

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.Debt.update(editing.id, {
        current_balance: Math.max(0, parseFloat(editing.current_balance) || 0),
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

  async function logPayment(e) {
    e.preventDefault();
    const amt = parseFloat(paying.amount) || 0;
    if (amt <= 0 || !paying.date) return;
    setLogging(true);
    try {
      const debt = debts.find((d) => d.id === paying.debt_id);
      const newBalance = Math.max(0, (debt.current_balance || 0) - amt);
      await base44.entities.DebtPayment.create({
        debt_id: paying.debt_id,
        amount: amt,
        date: paying.date,
        note: paying.note || "",
      });
      await base44.entities.Debt.update(paying.debt_id, {
        current_balance: newBalance,
        status: newBalance <= 0 ? "paid_off" : "active",
      });
      const fresh = await base44.entities.DebtPayment.list("-date", 500);
      setPayments(fresh);
      setPaying(null);
      if (newBalance <= 0) {
        confetti({ particleCount: 130, spread: 80, origin: { y: 0.65 }, colors: ["#8b5cf6", "#d946ef", "#34d399"] });
      }
      onChanged?.();
    } finally {
      setLogging(false);
    }
  }

  async function removePayment(payment) {
    await base44.entities.DebtPayment.delete(payment.id);
    const debt = debts.find((d) => d.id === payment.debt_id);
    const reversed = (debt.current_balance || 0) + (payment.amount || 0);
    await base44.entities.Debt.update(payment.debt_id, {
      current_balance: reversed,
      status: reversed <= 0 ? "paid_off" : "active",
    });
    const fresh = await base44.entities.DebtPayment.list("-date", 500);
    setPayments(fresh);
    onChanged?.();
  }

  if (!debts?.length) {
    return <p className="text-sm text-zinc-500 text-center py-10">No liabilities tracked yet.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {debts.map((d) => {
        const { interest, principal } = interestBreakdown(d);
        const min = d.minimum_payment || 0;
        const isPaid = d.status === "paid_off" || (d.current_balance || 0) <= 0;
        const interestPct = min > 0 ? Math.min(100, (interest / min) * 100) : 0;
        const principalPct = 100 - interestPct;
        const milestone = getMilestone(d);
        const history = paymentsByDebt[d.id] || [];
        const totalPaid = history.reduce((s, p) => s + (p.amount || 0), 0);
        const isOpen = expanded[d.id];

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
                <p className="text-[11px] text-zinc-500 mt-0.5">{isPaid ? "Paid off" : "Active liability"}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {milestone.tier && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border flex items-center gap-1 ${TIER_META[milestone.tier].className}`}>
                    <span>{TIER_META[milestone.tier].icon}</span>
                    {TIER_META[milestone.tier].label}
                  </span>
                )}
                {d.interest_rate > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 font-medium tabular-nums border border-rose-500/20">
                    {d.interest_rate}% APR
                  </span>
                )}
              </div>
            </div>

            <p className="text-2xl font-bold text-zinc-50 tabular-nums mb-2">
              ${(d.current_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {(d.original_balance || 0) > 0 && (
              <div className="mb-3">
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${milestone.pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">{milestone.pct.toFixed(0)}% paid down</p>
              </div>
            )}

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

            <div className="flex gap-2 mb-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex-1" onClick={() => setPaying({ debt_id: d.id, amount: "", date: format(new Date(), "yyyy-MM-dd"), note: "" })}>
                    <CreditCard className="h-3 w-3 mr-1.5" /> Log Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <DialogHeader>
                    <DialogTitle className="text-zinc-100">Log Payment · {d.name}</DialogTitle>
                    <DialogDescription className="text-zinc-500">Record a payment. It reduces the balance and appears in history.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={logPayment} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400">Amount ($)</Label>
                      <Input type="number" step="0.01" value={paying?.amount || ""} onChange={(e) => setPaying((p) => ({ ...p, amount: e.target.value }))} className="bg-zinc-950 border-zinc-800 text-zinc-100" autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400">Date</Label>
                      <Input type="date" value={paying?.date || ""} onChange={(e) => setPaying((p) => ({ ...p, date: e.target.value }))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400">Note (optional)</Label>
                      <Input value={paying?.note || ""} onChange={(e) => setPaying((p) => ({ ...p, note: e.target.value }))} placeholder="e.g. statement payment" className="bg-zinc-950 border-zinc-800 text-zinc-100" />
                    </div>
                    <DialogFooter className="pt-2">
                      <DialogClose asChild>
                        <Button type="button" variant="outline" className="border-zinc-800 text-zinc-400 hover:bg-zinc-800">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={logging} className="bg-zinc-100 text-zinc-900 hover:bg-white">
                        {logging ? "Saving..." : "Log Payment"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 flex-1" onClick={() => setEditing({ ...d })}>
                    <Plus className="h-3 w-3 mr-1.5 rotate-45" /> Edit
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
                      <Input type="number" step="0.01" defaultValue={d.current_balance} onChange={(e) => setEditing((prev) => ({ ...prev, current_balance: e.target.value }))} className="bg-zinc-950 border-zinc-800 text-zinc-100" />
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

            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [d.id]: !prev[d.id] }))}
              className="w-full flex items-center justify-between text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors py-1.5 border-t border-zinc-800/70"
            >
              <span className="font-medium uppercase tracking-wider">
                History · {history.length} {history.length === 1 ? "payment" : "payments"} · ${totalPaid.toFixed(2)} paid
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-xs text-zinc-600 py-2 text-center">No payments logged yet.</p>
                ) : (
                  history.map((p) => (
                    <div key={p.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/40">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-zinc-200 tabular-nums">
                          -${p.amount.toFixed(2)}
                          {p.note && <span className="text-zinc-500 font-normal ml-1.5 truncate">· {p.note}</span>}
                        </p>
                        <p className="text-[10px] text-zinc-500">{format(parseISO(p.date), "MMM d, yyyy")}</p>
                      </div>
                      <button onClick={() => removePayment(p)} className="h-5 w-5 rounded-md flex items-center justify-center text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete payment">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}