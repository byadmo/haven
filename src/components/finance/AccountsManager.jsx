import React from "react";
import { base44 } from "@/api/base44Client";
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
import { Plus, Trash2, Pencil, Check, X, Wallet, Landmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForecast } from "@/lib/forecast-context";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function AccountsManager({ onChanged }) {
  const [accounts, setAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("chequing");
  const [startBal, setStartBal] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [editName, setEditName] = React.useState("");

  const load = React.useCallback(async () => {
    const a = await base44.entities.Account.list("-created_date");
    setAccounts(a);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

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

  const total = accounts.reduce((s, a) => s + (a.balance || 0), 0);

  const fc = useForecast();
  const isFuture = !!fc?.isFuture;
  const dispTotal = isFuture ? (fc.point?.cashBalance ?? total) : total;

  return (
    <div>
      <div className="rounded-lg bg-black border border-white/10 p-5 hover:border-white/30 transition-colors duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 flex items-center justify-center bg-emerald-500/10 text-emerald-400">
              <Landmark className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-zinc-100">Chequing Accounts</h2>
              <p className="text-[11px] uppercase tracking-widest text-white/50">{isFuture ? `Projection · T+${fc.timelineIndex}` : "Cash moved by income & expenses"}</p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono tabular-nums tracking-tight text-emerald-400">{fmt(dispTotal)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <AnimatePresence mode="popLayout">
            {accounts.length === 0 && !loading && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full text-sm text-zinc-500 text-center py-6"
              >
                No accounts yet. Create your first chequing account below.
              </motion.p>
            )}
            {accounts.map((a) => (
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
                  <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
                <p className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-400">{fmt(a.balance || 0)}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

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