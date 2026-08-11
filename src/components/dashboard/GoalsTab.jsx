import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { money, pct } from "@/lib/dashboard";
import { Loader, Card3, Bar } from "@/components/dashboard/ui";
import { Plus, Target, Calendar, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AskAI from "@/components/finance/AskAI";
import { EmptyGoals } from "@/components/shared/EmptyStates";
import { relativeDate } from "@/lib/formatDates";

const PRI = { critical: "bg-rose-500", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-zinc-500" };
const PRI_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function GoalsTab({ refreshKey }) {
  const [goals, setGoals] = useState(null);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", target_amount: "", category: "savings", priority: "medium", target_date: "" });
  const [searchParams] = useSearchParams();

  // Auto-open add form if ?add=1
  useEffect(() => {
    if (searchParams.get("add") === "1") setShow(true);
  }, [searchParams]);

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

  // Sort goals: critical first, then by progress ascending
  const sorted = goals ? [...goals].sort((a, b) => {
    const pa = PRI_ORDER[a.priority] ?? 2;
    const pb = PRI_ORDER[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    const pa2 = a.target_amount > 0 ? (a.current_amount / a.target_amount) : 0;
    const pb2 = b.target_amount > 0 ? (b.current_amount / b.target_amount) : 0;
    return pa2 - pb2;
  }) : [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[10px] uppercase tracking-widest text-white/40">Active Goals</p>
        <div className="flex items-center gap-2">
          <AskAI path="/goals" />
          <Button variant="outline" size="sm" onClick={() => setShow((s) => !s)} className="border-white/10 text-white/70">
            <Plus className="h-3.5 w-3.5" /> {show ? "Cancel" : "Add Goal"}
          </Button>
        </div>
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
        <EmptyGoals onAdd={() => setShow(true)} />
      ) : (
        <>
          {/* Timeline Roadmap */}
          <Card3 title="Timeline Roadmap" subtitle="All goals on a calendar view">
            <div className="space-y-3">
              {sorted.filter((g) => g.status !== "completed").slice(0, 5).map((g, i, arr) => {
                const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
                const isLast = i === arr.length - 1;
                return (
                  <div key={g.id} className="relative flex items-start gap-3">
                    {/* Connector line */}
                    {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-white/10" />}
                    {/* Dot */}
                    <div className={`h-5 w-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      progress >= 100 ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-600 bg-zinc-800"
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${progress >= 100 ? "bg-emerald-400" : PRI[g.priority]}`} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{g.title}</p>
                        <span className="text-[10px] text-white/40">{pct(progress)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          g.status === "completed" ? "bg-emerald-500" : progress >= 75 ? "bg-lime-500" : "bg-sky-500"
                        }`} style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-mono text-white/40">{money(g.current_amount)} / {money(g.target_amount)}</span>
                        {g.target_date && (
                          <span className="text-[10px] text-white/40 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> {relativeDate(g.target_date, { prefix: "Due " })}
                          </span>
                        )}
                        <span className="text-[9px] uppercase tracking-widest text-white/30">{g.category}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {sorted.filter((g) => g.status !== "completed").length === 0 && (
                <p className="text-xs text-white/40 text-center py-4">All goals completed! 🎉</p>
              )}
            </div>
          </Card3>

          {/* Goal Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sorted.map((g) => {
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
                  {g.target_date && <p className="text-[10px] text-white/40 font-mono">{relativeDate(g.target_date, { prefix: "Target " })}</p>}
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
        </>
      )}
    </div>
  );
}