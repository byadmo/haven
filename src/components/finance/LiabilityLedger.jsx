import React from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CreditCard, Trash2, ChevronDown, Eye } from "lucide-react";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useForecast } from "@/lib/forecast-context";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

export default function LiabilityLedger({ debts, onChanged }) {
  const [editing, setEditing] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [payments, setPayments] = React.useState([]);
  const [paying, setPaying] = React.useState(null);
  const [logging, setLogging] = React.useState(false);
  const [expanded, setExpanded] = React.useState({});
  const [showOverride, setShowOverride] = React.useState({});

  const fc = useForecast();
  const point = fc?.point;
  const isFuture = !!fc?.isFuture;

  const currentShow = (d) =>
    showOverride[d.id] !== undefined ? showOverride[d.id] : !!d.show_in_accounts;

  React.useEffect(() => {
    base44.entities.DebtPayment.list("-date", 500).then(setPayments).catch(() => {});
  }, [debts]);

  const paymentsByDebt = React.useMemo(() => {
    const map = {};
    payments.forEach((p) => { (map[p.debt_id] = map[p.debt_id] || []).push(p); });
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

  async function toggleShowOnAccounts(d) {
    const next = !currentShow(d);
    setShowOverride((prev) => ({ ...prev, [d.id]: next }));
    try {
      await base44.entities.Debt.update(d.id, { show_in_accounts: next });
    } catch {
      setShowOverride((prev) => {
        const c = { ...prev };
        delete c[d.id];
        return c;
      });
    }
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
        debt_id: paying.debt_id, amount: amt, date: paying.date, note: paying.note || "",
      });
      await base44.entities.Debt.update(paying.debt_id, {
        current_balance: newBalance,
        status: newBalance <= 0 ? "paid_off" : "active",
      });
      const fresh = await base44.entities.DebtPayment.list("-date", 500);
      setPayments(fresh);
      setPaying(null);
      if (newBalance <= 0) {
        confetti({ particleCount: 130, spread: 80, origin: { y: 0.65 }, colors: ["#10b981", "#34d399", "#6ee7b7"] });
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
    return <p className="text-xs uppercase tracking-widest text-white/50 text-center py-10">No liabilities tracked.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {debts.map((d) => {
        const key = d.id || d.name;
        const proj = point?.liabilities?.[key];
        const balance = proj != null ? proj : (d.current_balance || 0);
        const isCleared = balance <= 0.005;
        const orig = d.original_balance || d.current_balance || 0;
        const pct = orig > 0 ? Math.min(100, Math.max(0, ((orig - balance) / orig) * 100)) : 0;
        const min = d.minimum_payment || 0;
        const interest = (d.current_balance || 0) * ((d.interest_rate || 0) / 100 / 12);
        const principal = Math.max(0, min - interest);
        const interestPct = min > 0 ? Math.min(100, (interest / min) * 100) : 0;
        const principalPct = 100 - interestPct;
        const history = paymentsByDebt[d.id] || [];
        const totalPaid = history.reduce((s, p) => s + (p.amount || 0), 0);
        const isOpen = expanded[d.id];

        const containerCx = `rounded-lg bg-black border ${isCleared ? "border-emerald-500/30 opacity-50" : "border-white/10"} p-4 hover:border-white/30 transition-colors duration-150`;

        return (
          <div key={d.id} className={containerCx}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-sm text-zinc-100">{d.name}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5">{isCleared ? "Cleared" : "Active liability"}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {!isCleared && (
                  <motion.button
                    type="button"
                    onClick={() => toggleShowOnAccounts(d)}
                    title="Toggle show on Accounts"
                    whileTap={{ scale: 0.94 }}
                    className={`flex items-center gap-1 text-[10px] uppercase tracking-widest border px-2 py-0.5 transition-colors ${
                      currentShow(d)
                        ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                        : "border-white/10 text-white/40 hover:text-white"
                    }`}
                  >
                    <Eye className="h-3 w-3" /> {currentShow(d) ? "On accounts" : "Show on accounts"}
                  </motion.button>
                )}
                {isCleared ? (
                  <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 font-mono text-xs uppercase border border-emerald-500/50">Cleared</div>
                ) : (
                  d.interest_rate > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 font-mono tabular-nums uppercase border border-white/10 text-white/50">{d.interest_rate}% APR</span>
                  ) : null
                )}
              </div>
            </div>

            <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-zinc-50 mb-2">{fmt(balance)}</p>

            <div className="mb-3">
              <div className="h-1.5 bg-white/10 overflow-hidden">
                {isCleared ? (
                  <div className="w-full h-full bg-emerald-500" />
                ) : (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-emerald-500"
                  />
                )}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mt-1 font-mono tabular-nums">{pct.toFixed(0)}% paid down</p>
            </div>

            {!isCleared && min > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5">Min. payment breakdown</p>
                <div className="flex h-2 bg-white/10 overflow-hidden">
                  <div className="bg-amber-500" style={{ width: `${interestPct}%` }} />
                  <div className="bg-emerald-500" style={{ width: `${principalPct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] mt-1.5 font-mono tabular-nums">
                  <span className="text-amber-400">INT {fmt(interest)}</span>
                  <span className="text-emerald-400">PRIN {fmt(principal)}</span>
                </div>
              </div>
            )}

            {!isFuture && (
              <div className="flex gap-2 mb-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setPaying({ debt_id: d.id, amount: "", date: format(new Date(), "yyyy-MM-dd"), note: "" })} className="border-white/10 bg-black text-zinc-200 hover:border-white/30 hover:text-white flex-1">
                      <CreditCard className="h-3 w-3 mr-1.5" /> Log Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-100">Log Payment · {d.name}</DialogTitle>
                      <DialogDescription className="text-white/50">Record a payment against the live balance.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={logPayment} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-white/50">Amount ($)</Label>
                        <Input type="number" step="0.01" value={paying?.amount || ""} onChange={(e) => setPaying((p) => ({ ...p, amount: e.target.value }))} className="bg-black border-white/10 text-zinc-100" autoFocus />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/50">Date</Label>
                        <Input type="date" value={paying?.date || ""} onChange={(e) => setPaying((p) => ({ ...p, date: e.target.value }))} className="bg-black border-white/10 text-zinc-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/50">Note (optional)</Label>
                        <Input value={paying?.note || ""} onChange={(e) => setPaying((p) => ({ ...p, note: e.target.value }))} placeholder="e.g. statement payment" className="bg-black border-white/10 text-zinc-100" />
                      </div>
                      <DialogFooter className="pt-2">
                        <DialogClose asChild><Button type="button" variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={logging} className="bg-emerald-500 text-black hover:bg-emerald-400">{logging ? "Saving..." : "Log Payment"}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditing({ ...d })} className="border-white/10 bg-black text-zinc-200 hover:border-white/30 hover:text-white flex-1">
                      <Plus className="h-3 w-3 mr-1.5 rotate-45" /> Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-black border-white/10 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-100">Edit {d.name}</DialogTitle>
                      <DialogDescription className="text-white/50">Update balance, APR, or minimum payment.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={saveEdit} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-white/50">Current Balance ($)</Label>
                        <Input type="number" step="0.01" defaultValue={d.current_balance} onChange={(e) => setEditing((prev) => ({ ...prev, current_balance: e.target.value }))} className="bg-black border-white/10 text-zinc-100" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-white/50">APR (%)</Label>
                          <Input type="number" step="0.01" defaultValue={d.interest_rate} onChange={(e) => setEditing((prev) => ({ ...prev, interest_rate: e.target.value }))} className="bg-black border-white/10 text-zinc-100" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-white/50">Min. Payment ($)</Label>
                          <Input type="number" step="0.01" defaultValue={d.minimum_payment} onChange={(e) => setEditing((prev) => ({ ...prev, minimum_payment: e.target.value }))} className="bg-black border-white/10 text-zinc-100" />
                        </div>
                      </div>
                      <DialogFooter className="pt-2">
                        <DialogClose asChild><Button type="button" variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={saving} className="bg-zinc-100 text-black hover:bg-white">{saving ? "Saving..." : "Save Changes"}</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button variant="ghost" size="sm" onClick={() => remove(d.id)} className="text-white/40 hover:text-rose-400 hover:bg-rose-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {isFuture && (
              <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3 font-mono">T+{fc.timelineIndex} · future state · log disabled</div>
            )}

            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [d.id]: !prev[d.id] }))}
              className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-white/50 hover:text-white/80 transition-colors py-1.5 border-t border-white/10"
            >
              <span className="font-medium font-mono tabular-nums">
                History · {history.length} {history.length === 1 ? "payment" : "payments"} · {fmt(totalPaid)} paid
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-xs text-white/30 py-2 text-center">No payments logged yet.</p>
                ) : (
                  history.map((p) => (
                    <div key={p.id} className="group flex items-center gap-2 px-2 py-1.5 hover:bg-white/5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium font-mono tabular-nums text-zinc-200">-{fmt(p.amount)}
                          {p.note && <span className="text-white/40 font-normal ml-1.5 truncate">· {p.note}</span>}
                        </p>
                        <p className="text-[10px] font-mono tabular-nums text-white/40">{format(parseISO(p.date), "MMM d, yyyy")}</p>
                      </div>
                      {!isFuture && (
                        <button onClick={() => removePayment(p)} className="h-5 w-5 flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-rose-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" aria-label="Delete payment">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
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