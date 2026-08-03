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
import { Plus, Trash2, Pencil, Check, X, Landmark, Eye, EyeOff, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForecast } from "@/lib/forecast-context";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SHOW_INVEST_KEY = "dd.accounts.showInvestments";

export default function AccountsManager({ onChanged }) {
  const [accounts, setAccounts] = React.useState([]);
  const [stocks, setStocks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("chequing");
  const [startBal, setStartBal] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [editName, setEditName] = React.useState("");
  const [showHidden, setShowHidden] = React.useState(false);
  const [showInvestments, setShowInvestments] = React.useState(
    () => localStorage.getItem(SHOW_INVEST_KEY) === "1"
  );

  const load = React.useCallback(async () => {
    const [a, s] = await Promise.all([
      base44.entities.Account.list("-created_date"),
      base44.entities.Stock.list("-created_date").catch(() => []),
    ]);
    setAccounts(a);
    setStocks(s);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function toggleInvestments() {
    setShowInvestments((prev) => {
      const next = !prev;
      localStorage.setItem(SHOW_INVEST_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function toggleVisibility(a) {
    const next = a.show_in_summary === false ? true : false;
    await base44.entities.Account.update(a.id, { show_in_summary: next });
    await load();
    onChanged?.();
  }

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
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
    await base44.entities.Account.update(id, { name: editName.trim() });
    setEditId(null);
    await load();
    onChanged?.();
  }

  const visibleAccounts = accounts.filter((a) => a.show_in_summary !== false);
  const hiddenAccounts = accounts.filter((a) => a.show_in_summary === false);
  const bankTotal = visibleAccounts.reduce((s, a) => s + (a.balance || 0), 0);

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

  const fc = useForecast();
  const isFuture = !!fc?.isFuture;
  const dispTotal = isFuture
    ? fc.point?.cashBalance ?? bankTotal
    : bankTotal + (showInvestments ? investTotal : 0);

  return (
    <div>
      <div className="rounded-lg bg-black border border-white/10 p-5 hover:border-white/30 transition-colors duration-150">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 flex items-center justify-center bg-emerald-500/10 text-emerald-400 shrink-0">
              <Landmark className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-zinc-100">Accounts</h2>
              <p className="text-[11px] uppercase tracking-widest text-white/50 truncate">
                {isFuture ? `Projection · T+${fc.timelineIndex}` : "Cash & investments"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleInvestments}
              title="Toggle investment accounts"
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest border px-2.5 py-1.5 rounded-md transition-colors ${
                showInvestments
                  ? "border-indigo-500/40 text-indigo-300 bg-indigo-500/10"
                  : "border-white/10 text-white/50 hover:text-white"
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" /> {showInvestments ? "Investments on" : "Investments"}
            </button>
            <span className="text-sm font-bold font-mono tabular-nums tracking-tight text-emerald-400">
              {fmt(dispTotal)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <AnimatePresence mode="popLayout">
            {visibleAccounts.length === 0 && !loading && (!showInvestments || investmentGroups.length === 0) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-sm text-zinc-500 text-center py-6"
              >
                No accounts shown. Add your first account below.
              </motion.p>
            )}
            {visibleAccounts.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-white/10 bg-black p-3.5 group hover:border-white/30 transition-colors duration-150"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">
                    {a.type || "chequing"}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => toggleVisibility(a)}
                      title={a.show_in_summary === false ? "Show in summary" : "Hide from summary"}
                      className="h-6 w-6 rounded-md flex items-center justify-center text-white/50 hover:text-zinc-200 hover:bg-zinc-800"
                    >
                      {a.show_in_summary === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {editId === a.id ? (
                      <>
                        <button
                          onClick={() => commitRename(a.id)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-500 hover:bg-zinc-800"
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
                          }}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove(a.id)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editId === a.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && commitRename(a.id)}
                    className="h-8 bg-zinc-900 border-zinc-800 text-zinc-100 text-sm mb-1"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm font-semibold text-zinc-100 mb-1 truncate">{a.name}</p>
                )}
                <p className="text-lg sm:text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-400">
                  {fmt(a.balance || 0)}
                </p>
              </motion.div>
            ))}

            {showInvestments &&
              investmentGroups.map((g) => (
                <motion.div
                  key={`inv-${g.account}`}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-white/10 bg-black p-3.5 hover:border-indigo-500/30 transition-colors"
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
          </AnimatePresence>
        </div>

        {hiddenAccounts.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              {showHidden ? "Hide hidden accounts" : `${hiddenAccounts.length} hidden account${hiddenAccounts.length === 1 ? "" : "s"}`}
            </button>
            {showHidden && (
              <div className="mt-2 flex flex-wrap gap-2">
                {hiddenAccounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggleVisibility(a)}
                    className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black px-2.5 py-1.5 text-xs text-white/60 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    {a.name} <span className="text-white/30 font-mono tabular-nums">{fmt(a.balance || 0)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={create} className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-zinc-800">
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
    </div>
  );
}