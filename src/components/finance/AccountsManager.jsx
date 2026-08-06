import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Check, X, Landmark, Eye, EyeOff, ScanLine, Briefcase, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import AccountBalanceImportModal from "@/components/finance/AccountBalanceImportModal";
import TransferModal from "@/components/finance/TransferModal";
import DebtModal from "@/components/finance/DebtModal";
import LiabilityLedger from "@/components/finance/LiabilityLedger";
import AccountHistory from "@/components/finance/AccountHistory";
import { useForecast } from "@/lib/forecast-context";
import { useCurrency } from "@/lib/currency-context";

const SectionHeader = ({ icon: Icon, children }) => (
  <h3 className="text-[11px] uppercase tracking-widest text-white/50 mb-3 flex items-center gap-1.5 font-semibold">
    <Icon className="h-3.5 w-3.5" /> {children}
  </h3>
);

export default function AccountsManager({ onChanged }) {
  const { fmtMoney: fmt } = useCurrency();
  const { toast } = useToast();
  const [accounts, setAccounts] = React.useState([]);
  const [stocks, setStocks] = React.useState([]);
  const [debts, setDebts] = React.useState([]);
  const [transactions, setTransactions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("chequing");
  const [startBal, setStartBal] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [editName, setEditName] = React.useState("");
  const [editBal, setEditBal] = React.useState("");
  const [scanOpen, setScanOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [debtOpen, setDebtOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    const [a, s, d, tx] = await Promise.all([
      base44.entities.Account.list("-created_date"),
      base44.entities.Stock.list("-created_date").catch(() => []),
      base44.entities.Debt.list("-created_date").catch(() => []),
      base44.entities.Transaction.list("-date", 500).catch(() => []),
    ]);
    setAccounts(a);
    setStocks(s);
    setDebts(d);
    setTransactions(tx);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
    const unsubDebt = base44.entities.Debt.subscribe(() => {
      base44.entities.Debt.list("-created_date").then(setDebts).catch(() => {});
    });
    const unsubAcct = base44.entities.Account.subscribe(() => {
      base44.entities.Account.list("-created_date").then(setAccounts).catch(() => {});
    });
    const unsubTx = base44.entities.Transaction.subscribe(() => {
      base44.entities.Transaction.list("-date", 500).then(setTransactions).catch(() => {});
    });
    return () => { unsubDebt(); unsubAcct(); unsubTx(); };
  }, [load]);

  async function toggleVisibility(a) {
    const next = a.show_in_summary === false ? true : false;
    await base44.entities.Account.update(a.id, { show_in_summary: next });
    await load();
    onChanged?.();
  }

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    // B10 — prevent duplicate account names.
    if (accounts.some((a) => a.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      toast({ title: "Account already exists", description: `An account named "${name.trim()}" already exists.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Account.create({
        name: name.trim(),
        type,
        balance: parseFloat(startBal) || 0,
      });
      setName("");
      setStartBal("");
      await load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await base44.entities.Account.delete(id);
    await load();
    onChanged?.();
  }

  async function commitRename(id) {
    if (!editName.trim()) return;
    const bal = parseFloat(editBal);
    await base44.entities.Account.update(id, {
      name: editName.trim(),
      ...(isNaN(bal) ? {} : { balance: bal }),
    });
    setEditId(null);
    setEditBal("");
    await load();
    onChanged?.();
  }

  const bankTotal = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const investmentGroups = React.useMemo(() => {
    const map = {};
    stocks.forEach((st) => {
      const k = st.account || "Non-Registered";
      (map[k] = map[k] || { account: k, value: 0 });
      map[k].value += (st.shares || 0) * (st.avg_buy_price || 0);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [stocks]);
  const investTotal = investmentGroups.reduce((s, g) => s + g.value, 0);

  const activeDebts = debts.filter(
    (d) => (d.status || "active") !== "paid_off"
  );
  const debtsTotal = activeDebts.reduce((s, d) => s + (d.current_balance || 0), 0);

  const fc = useForecast();
  const isFuture = !!fc?.isFuture;
  const dispTotal = isFuture
    ? fc.point?.cashBalance ?? bankTotal
    : bankTotal + investTotal - debtsTotal;

  const renderAccountCard = (a) => (
    <motion.div
      key={a.id}
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`rounded-lg border bg-black p-3 sm:p-3.5 group hover:border-white/30 transition-colors duration-150 ${a.show_in_summary === false ? "border-white/5 border-dashed opacity-60" : "border-white/10"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">
          {a.type || "chequing"}
        </span>
        <div className="flex items-center gap-0">
          <button
            onClick={() => toggleVisibility(a)}
            title={a.show_in_summary === false ? "Show in summary" : "Hide from summary"}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center text-white/50 hover:text-zinc-200 hover:bg-zinc-800"
          >
            {a.show_in_summary === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          {editId === a.id ? (
            <>
              <button
                onClick={() => commitRename(a.id)}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setEditId(null)}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-800"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditId(a.id);
                  setEditName(a.name);
                  setEditBal(String(a.balance ?? 0));
                }}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => remove(a.id)}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-md flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {editId === a.id ? (
        <div className="space-y-1.5 mb-1">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitRename(a.id)}
            className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100 text-sm"
            autoFocus
          />
          <Input
            type="number"
            step="0.01"
            value={editBal}
            onChange={(e) => setEditBal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitRename(a.id)}
            placeholder="Balance"
            className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100 text-sm font-mono tabular-nums"
          />
        </div>
      ) : (
        <p className="text-sm font-semibold text-zinc-100 mb-1 truncate">{a.name}</p>
      )}
      <p className={`text-lg sm:text-xl font-bold font-mono tabular-nums tracking-tight ${(a.balance || 0) < 0 ? "text-rose-400" : "text-emerald-400"}`}>
        {fmt(a.balance || 0)}
      </p>
      {(a.balance || 0) < 0 && (
        <p className="text-[10px] uppercase tracking-widest text-rose-400/90 font-medium mt-0.5 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" /> Overdrawn
        </p>
      )}
    </motion.div>
  );

  return (
    <div>
      <div className="rounded-lg bg-black border border-white/10 p-4 sm:p-5 hover:border-white/30 transition-colors duration-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 flex items-center justify-center bg-emerald-500/10 text-emerald-400 shrink-0">
              <Landmark className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-zinc-100">All Accounts</h2>
              <p className="text-[11px] uppercase tracking-widest text-white/50 truncate">
                {isFuture ? `Projection · T+${fc.timelineIndex}` : "Cash · investments · liabilities"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setTransferOpen(true)}
              title="Transfer between accounts"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest border px-2.5 py-1.5 rounded-md transition-colors border-indigo-500/40 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
            </button>
            <button
              type="button"
              onClick={() => setDebtOpen(true)}
              title="Add a liability"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest border px-2.5 py-1.5 rounded-md transition-colors border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20"
            >
              <Plus className="h-3.5 w-3.5" /> Liability
            </button>
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              title="Scan balance from a photo"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest border px-2.5 py-1.5 rounded-md transition-colors border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              <ScanLine className="h-3.5 w-3.5" /> Update Balance
            </button>
            <span className={`text-sm font-bold font-mono tabular-nums tracking-tight ${dispTotal < 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {fmt(dispTotal)}
            </span>
          </div>
        </div>

        {/* Chequing & Savings */}
        <div className="mb-6">
          <SectionHeader icon={Landmark}>Chequing & Savings</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            <AnimatePresence mode="popLayout">
              {accounts.length === 0 && !loading && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full text-sm text-zinc-500 text-center py-4"
                >
                  No bank accounts yet.
                </motion.p>
              )}
              {accounts.map(renderAccountCard)}
            </AnimatePresence>
          </div>
        </div>

        {/* Investments */}
        {investmentGroups.length > 0 && (
          <div className="mb-6">
            <SectionHeader icon={Briefcase}>Investments</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {investmentGroups.map((g) => (
                <motion.div
                  key={`inv-${g.account}`}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-white/10 bg-black p-3 sm:p-3.5 hover:border-indigo-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">Investment</span>
                    <Briefcase className="h-3.5 w-3.5 text-indigo-300" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-100 mb-1 truncate">{g.account}</p>
                  <p className="text-lg sm:text-xl font-bold font-mono tabular-nums tracking-tight text-indigo-300">
                    {fmt(g.value)}
                  </p>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 mt-1">Cost basis</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Liabilities — full editable ledger */}
        <LiabilityLedger debts={debts} onChanged={onChanged} showPayoffTarget={false} />
      </div>

      {/* Add Account — separate box */}
      <div className="rounded-lg bg-black border border-white/10 p-4 sm:p-5 mt-4">
        <h3 className="text-[11px] uppercase tracking-widest text-white/50 mb-3">Add Account</h3>
        <form onSubmit={create} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name (e.g. RBC Chequing)"
            className="bg-zinc-950 border-zinc-800 text-zinc-100 flex-1"
          />
          <Input
            type="number"
            step="0.01"
            value={startBal}
            onChange={(e) => setStartBal(e.target.value)}
            placeholder="Starting balance"
            className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:w-40"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100 sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              <SelectItem value="chequing">Chequing</SelectItem>
              <SelectItem value="savings">Savings</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={saving || !name} className="bg-zinc-100 text-zinc-900 hover:bg-white">
            <Plus className="h-4 w-4 mr-1" /> {saving ? "Adding…" : "Add"}
          </Button>
        </form>
      </div>

      <AccountHistory accounts={accounts} debts={debts} transactions={transactions} onChanged={onChanged} />

      <AccountBalanceImportModal
        open={scanOpen}
        onOpenChange={setScanOpen}
        accounts={accounts}
        debts={debts}
        onSaved={load}
      />

      <TransferModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={accounts}
        debts={debts}
        onSaved={load}
      />

      <DebtModal
        open={debtOpen}
        onOpenChange={setDebtOpen}
        accounts={accounts}
        onSaved={() => { load(); onChanged?.(); }}
      />
    </div>
  );
}