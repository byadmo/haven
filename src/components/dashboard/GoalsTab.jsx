import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { money, pct } from "@/lib/dashboard";
import { Loader, Card3, Bar } from "@/components/dashboard/ui";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRI = { critical: "bg-rose-500", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-zinc-500" };

export default function GoalsTab({ refreshKey }) {
  const [goals, setGoals] = useState(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", target_amount: "", category: "savings", priority: "medium", target_date: "" });

  async function load() {
    try { const g = await base44.entities.ActiveGoal.list(); setGoals(g); } catch (e) { setGoals([]); }
  }
  useEffect(() => { load(); }, [refreshKey]);

  async function add() {
    if (!form.title || !form.target_amount) return;
    await base44.entities.ActiveGoal.create({
      title: form.title,
      target_amount: Number(form.target_amount),
      category: form.category,
      priority: form.priority,
      target_date: form.target_date || null,
      status: "active",
      current_amount: 0,
    });
    setForm({ title: "", target_amount: "", category: "savings", priority: "medium", target_date: "" });
    setShow(false);
    load();
  }

  async function updateProgress(g, delta) {
    const next = Math.max(0, (g.current_amount || 0) + delta);
    await base44.entities.ActiveGoal.update(g.id, { current_amount: next, status: next >= g.target_amount ? "completed" : "active" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[10px] uppercase tracking-widest text-white/40">Active Goals</p>
        <Button variant="outline" size="sm" onClick={() => setShow((s) => !s)} className="border-white/10 text-white/70">
          <Plus className="h-3.5 w-3.5" /> {show ? "Cancel" : "Add Goal"}
        </Button>
      </div>

      {show && (
        <Card3 title="New Goal">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-black border-white/10 text-zinc-100" />
            <Input type="number" placeholder="Target amount" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} className="bg-black border-white/10 text-zinc-100" />
            <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="bg-black border-white/10 text-zinc-100" />
            <div className="flex gap-2">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="flex-1 bg-black border border-white/10 rounded-md text-xs text-zinc-100 px-2 py-1">
                {["debt_payoff", "savings", "investment", "emergency_fund", "other"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="flex-1 bg-black border border-white/10 rounded-md text-xs text-zinc-100 px-2 py-1">
                {["critical", "high", "medium", "low"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={add} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white">Create Goal</Button>
        </Card3>
      )}

      {!goals ? <Loader /> : goals.length === 0 ? (
        <Card3><p className="text-xs text-white/40">No goals yet — add one above.</p></Card3>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map((g) => {
            const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            return (
              <div key={g.id} className={`rounded-xl border p-3 ${g.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-black"}`}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${PRI[g.priority]}`} />
                    <p className="text-sm font-medium text-white">{g.title}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-white/40">{g.category}</span>
                </div>
                {g.target_date && <p className="text-[10px] text-white/40 font-mono">Target {g.target_date}</p>}
                <p className="text-lg font-bold font-mono tabular-nums text-white mt-1">{money(g.current_amount)} / {money(g.target_amount)}</p>
                <div className="my-1.5"><Bar value={progress} max={100} color={g.status === "completed" ? "bg-emerald-500" : progress >= 75 ? "bg-lime-500" : "bg-sky-500"} /></div>
                <p className="text-[10px] text-white/40">{pct(progress)} · {g.status}</p>
                {g.status !== "completed" && (
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" onClick={() => updateProgress(g, 50)} className="border-white/10 text-white/60 text-[11px] h-7">+$50</Button>
                    <Button size="sm" variant="outline" onClick={() => updateProgress(g, 100)} className="border-white/10 text-white/60 text-[11px] h-7">+$100</Button>
                    <Button size="sm" variant="outline" onClick={() => updateProgress(g, 250)} className="border-white/10 text-white/60 text-[11px] h-7">+$250</Button>
                    <Button size="sm" variant="outline" onClick={() => updateProgress(g, g.target_amount - (g.current_amount || 0))} className="border-white/10 text-emerald-400 text-[11px] h-7 ml-auto">Complete</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}