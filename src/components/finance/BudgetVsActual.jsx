import React, { useMemo, useState } from "react";
import { Scale, Plus } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STORE = "dd:budgetlimits-v2";

export default function BudgetVsActual() {
  const { transactions, categories } = useFinanceData();
  const [limits, setLimits] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; }
  });
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");

  const spentMap = useMemo(() => {
    const now = new Date();
    const m = {};
    (transactions || []).forEach((t) => {
      if (t.type !== "expense" || !t.date) return;
      const d = new Date(t.date + "T00:00:00");
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
      const k = t.category || "Uncategorized";
      m[k] = (m[k] || 0) + (t.amount || 0);
    });
    return m;
  }, [transactions]);

  const cats = useMemo(() => {
    const set = new Set();
    (categories || []).forEach((c) => set.add(c.name));
    Object.keys(limits).forEach((k) => set.add(k));
    Object.keys(spentMap).forEach((k) => set.add(k));
    return [...set].filter(Boolean).sort();
  }, [categories, limits, spentMap]);

  function persist(next) { setLimits(next); try { localStorage.setItem(STORE, JSON.stringify(next)); } catch {} }
  function saveBudget(cat, val) {
    const n = parseFloat(val);
    const next = { ...limits };
    if (!n || n <= 0) delete next[cat]; else next[cat] = n;
    persist(next);
    setEditing(null); setDraft("");
  }
  function addCategory() {
    const name = prompt("New budget category name:");
    if (!name) return;
    persist({ ...limits, [name]: 0 });
    setEditing(name); setDraft("");
  }

  const totalBudget = cats.reduce((s, c) => s + (limits[c] || 0), 0);
  const totalSpent = cats.reduce((s, c) => s + (spentMap[c] || 0), 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold text-zinc-100">Budget vs Actual · this month</h2>
        </div>
        <Button size="sm" variant="outline" onClick={addCategory} className="border-white/10 text-white/70 hover:bg-white/5 h-8">
          <Plus className="h-3.5 w-3.5" /> Category
        </Button>
      </div>

      {cats.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-6">No categories or budgets yet.</p>
      ) : (
        <div className="space-y-2">
          {cats.map((c) => {
            const budget = limits[c] || 0;
            const spent = spentMap[c] || 0;
            const ratio = budget > 0 ? spent / budget : 0;
            const pct = budget > 0 ? Math.min(100, ratio * 100) : 0;
            const barColor = budget <= 0 ? "#64748b" : ratio < 0.7 ? "#34d399" : ratio <= 0.9 ? "#fbbf24" : "#f87171";
            const over = budget > 0 ? spent - budget : 0;
            return (
              <div key={c} className="rounded-md border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs text-zinc-100 truncate">{c}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono tabular-nums text-white/60">
                      ${spent.toFixed(0)} / {budget > 0 ? `$${budget.toFixed(0)}` : "—"}
                    </span>
                    {editing === c ? (
                      <Input autoFocus type="number" value={draft} onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveBudget(c, draft); if (e.key === "Escape") { setEditing(null); setDraft(""); } }}
                        onBlur={() => saveBudget(c, draft)}
                        placeholder="Monthly limit" className="w-24 h-7 bg-black border-white/10 text-xs tabular-nums px-2" />
                    ) : (
                      <button onClick={() => { setEditing(c); setDraft(budget > 0 ? String(budget) : ""); }}
                        className="text-[10px] uppercase tracking-widest text-emerald-300 hover:text-emerald-200 border border-white/10 rounded px-1.5 py-0.5">
                        {budget > 0 ? "Edit" : "Set Budget"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-2 bg-white/10 overflow-hidden rounded">
                  <div className="h-full rounded" style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-white/35 font-mono tabular-nums">
                    {budget > 0 ? `$${(budget - spent).toFixed(0)} left` : "no limit set"}
                  </span>
                  {over > 0 && <span className="text-[10px] text-rose-300 font-mono tabular-nums">+${over.toFixed(0)} over</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
        <div><p className="text-xs font-mono tabular-nums text-zinc-100">${totalBudget.toFixed(0)}</p><p className="text-[9px] uppercase tracking-widest text-white/40">Budgeted</p></div>
        <div><p className="text-xs font-mono tabular-nums text-zinc-100">${totalSpent.toFixed(0)}</p><p className="text-[9px] uppercase tracking-widest text-white/40">Spent</p></div>
        <div><p className={`text-xs font-mono tabular-nums ${totalBudget - totalSpent >= 0 ? "text-emerald-300" : "text-rose-300"}`}>${(totalBudget - totalSpent).toFixed(0)}</p><p className="text-[9px] uppercase tracking-widest text-white/40">Remaining</p></div>
      </div>
    </div>
  );
}