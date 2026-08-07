// Recurring Bills & Subscriptions — full management hub for every recurring
// bill, subscription, and scheduled payment. AI auto-detection, upcoming
// (next 30 days), and the full tracked list with pause/edit/delete + review.
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Receipt, Plus, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import RecurringBillForm from "@/components/recurring/RecurringBillForm";
import BillRow from "@/components/recurring/BillRow";
import PaychequeAllocator from "@/components/allocator/PaychequeAllocator";
import { useFinanceData } from "@/lib/FinanceDataContext";
import {
  detectBillCandidates, advanceDueDate, dayDiff, freqLabel,
} from "@/lib/recurringBills";

export default function RecurringBills() {
  const { transactions, accounts, aiAutoDetect, setAiAutoDetect } = useFinanceData();
  const { toast } = useToast();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [scannedOnce, setScannedOnce] = useState(false);
  const [vaults, setVaults] = useState([]);
  const [loadingVaults, setLoadingVaults] = useState(true);

  const loadBills = useCallback(async () => {
    try {
      const list = await base44.entities.RecurringBill.list("-created_date", 500);
      setBills(list || []);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVaults = useCallback(async () => {
    try {
      const list = await base44.entities.AllocationVault.list("display_order", 200);
      setVaults((list || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    } catch {
      setVaults([]);
    } finally {
      setLoadingVaults(false);
    }
  }, []);

  useEffect(() => { loadBills(); loadVaults(); }, [loadBills, loadVaults]);

  // Auto-scan once on mount when AI detection is enabled.
  useEffect(() => {
    if (scannedOnce || loading) return;
    setScannedOnce(true);
    if (aiAutoDetect) runScan(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiAutoDetect, scannedOnce, loading]);

  async function runScan(announce) {
    if (scanning) return;
    setScanning(true);
    try {
      const fresh = bills.length ? bills : await base44.entities.RecurringBill.list("-created_date", 500).catch(() => []);
      const candidates = detectBillCandidates(transactions, fresh || []);
      if (candidates.length) {
        await base44.entities.RecurringBill.bulkCreate(candidates);
        toast({
          title: `AI detected ${candidates.length} new recurring bill${candidates.length === 1 ? "" : "s"}`,
          description: candidates.slice(0, 3).map((c) => `${c.name} — $${c.amount.toFixed(2)}/${freqLabel(c.frequency)}`).join("  ·  "),
        });
        loadBills();
      } else if (announce) {
        toast({ title: "No new recurring bills detected" });
      }
    } catch (e) {
      if (announce) toast({ title: "Scan failed", variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }

  async function markPaid(b) {
    const today = new Date().toISOString().slice(0, 10);
    const next = advanceDueDate(b.next_due_date, b.frequency, b.custom_interval_days);
    try {
      await base44.entities.RecurringBill.update(b.id, { next_due_date: next, last_paid_date: today });
      // Deduct from the linked AllocationVault's running balance.
      if (b.vault_id) {
        try {
          const arr = await base44.entities.AllocationVault.filter({ id: b.vault_id });
          const v = arr && arr[0];
          if (v) {
            const newBal = Math.max(0, (Number(v.current_balance) || 0) - (Number(b.amount) || 0));
            await base44.entities.AllocationVault.update(v.id, { current_balance: newBal });
            loadVaults();
          }
        } catch {}
      }
      toast({ title: "Bill marked paid", description: `${b.name} — next due ${next}` });
      loadBills();
    } catch {
      toast({ title: "Couldn't update bill", variant: "destructive" });
    }
  }

  async function toggleActive(b) {
    try {
      await base44.entities.RecurringBill.update(b.id, { is_active: !b.is_active });
      loadBills();
    } catch {
      toast({ title: "Couldn't update bill", variant: "destructive" });
    }
  }

  async function reviewBill(b, status) {
    const patch = status === "confirmed"
      ? { ai_review_status: "confirmed", is_ai_detected: false }
      : { ai_review_status: "rejected", is_active: false };
    try {
      await base44.entities.RecurringBill.update(b.id, patch);
      toast({ title: status === "confirmed" ? "Bill confirmed" : "Bill dismissed" });
      loadBills();
    } catch {
      toast({ title: "Couldn't review bill", variant: "destructive" });
    }
  }

  async function deleteBill(b) {
    try {
      await base44.entities.RecurringBill.delete(b.id);
      loadBills();
    } catch {
      toast({ title: "Couldn't delete bill", variant: "destructive" });
    }
  }

  function openEdit(b) { setEditing(b); setFormOpen(true); }
  function openAdd() { setEditing(null); setFormOpen(true); }

  // Rejected bills are hidden but kept for AI dedup.
  const visibleBills = useMemo(() => bills.filter((b) => b.ai_review_status !== "rejected"), [bills]);
  const upcoming = useMemo(() => {
    return visibleBills
      .filter((b) => b.is_active)
      .filter((b) => { const dd = dayDiff(b.next_due_date); return dd != null && dd >= 0 && dd <= 30; })
      .sort((a, b) => (a.next_due_date || "").localeCompare(b.next_due_date || ""));
  }, [visibleBills]);

  const sum7 = upcoming.filter((b) => dayDiff(b.next_due_date) <= 7).reduce((s, b) => s + (b.amount || 0), 0);
  const sum14 = upcoming.filter((b) => dayDiff(b.next_due_date) <= 14).reduce((s, b) => s + (b.amount || 0), 0);
  const sum30 = upcoming.reduce((s, b) => s + (b.amount || 0), 0);
  const aiPending = visibleBills.filter((b) => b.is_active && b.ai_review_status === "pending");
  const activeCount = visibleBills.filter((b) => b.is_active).length;

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Reveal><PageTitle title="Recurring Bills & Subscriptions" subtitle="Manage every recurring bill, subscription, and scheduled payment in one place" icon={Receipt} /></Reveal>

        <Tabs defaultValue="bills" className="w-full">
          <TabsList className="bg-black border border-white/10 h-9">
            <TabsTrigger value="bills">Bills & Subscriptions</TabsTrigger>
            <TabsTrigger value="allocator">Paycheque Allocator</TabsTrigger>
          </TabsList>

          <TabsContent value="bills" className="space-y-6 mt-4">
        {/* Section 4 — AI Auto-Detection toggle */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-9 w-9 grid place-items-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 shrink-0">
                <Sparkles className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100">AI Auto-Detection</p>
                <p className="text-[11px] text-white/50 mt-0.5 leading-snug">Automatically scan your transactions to detect and add recurring bills and subscriptions. Detected bills appear as "Pending Review" until you confirm or dismiss them.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button size="sm" variant="outline" onClick={() => runScan(true)} disabled={scanning} className="border-white/10 text-white/70 hover:text-white hover:border-white/30">
                {scanning ? "Scanning…" : "Scan now"}
              </Button>
              <Switch checked={aiAutoDetect} onCheckedChange={setAiAutoDetect} />
            </div>
          </div>
        </Reveal>

        {/* Summary (7 / 14 / 30 day rollups) */}
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Due in 7 days" value={fmt(sum7)} tone="rose" />
            <SummaryCard label="Due in 14 days" value={fmt(sum14)} tone="amber" />
            <SummaryCard label="Due in 30 days" value={fmt(sum30)} tone="emerald" />
            <SummaryCard label="Active bills" value={String(activeCount)} tone="neutral" />
          </div>
        </Reveal>

        {/* AI pending-review banner */}
        {aiPending.length > 0 && (
          <Reveal>
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-4">
              <p className="text-xs text-amber-300 mb-2 font-medium">{aiPending.length} AI-detected bill{aiPending.length === 1 ? "" : "s"} awaiting review</p>
              <div className="space-y-2">
                {aiPending.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-2 rounded border border-white/10 bg-black/50 p-2">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-100 truncate">{b.name}</p>
                      <p className="text-[10px] text-white/40 font-mono tabular-nums">${(b.amount || 0).toFixed(2)} · {freqLabel(b.frequency)} · due {b.next_due_date}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => reviewBill(b, "confirmed")} title="Confirm" className="h-7 w-7 grid place-items-center rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"><CheckCircle2 className="h-4 w-4" /></button>
                      <button onClick={() => reviewBill(b, "rejected")} title="Dismiss" className="h-7 w-7 grid place-items-center rounded border border-white/10 text-white/50 hover:text-rose-300 hover:border-rose-400/30"><XCircle className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* Add Bill */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">All Recurring Bills</h2>
          <Button size="sm" onClick={openAdd} className="bg-emerald-500 text-white hover:bg-emerald-600">
            <Plus className="h-4 w-4 mr-1" /> Add Bill
          </Button>
        </div>

        {/* Section 3 — Upcoming (next 30 days) */}
        <Reveal>
          <section className="rounded-lg border border-white/10 bg-black p-4">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Upcoming · next 30 days</p>
            {upcoming.length ? (
              <div className="space-y-1.5">
                {upcoming.map((b) => (
                  <BillRow key={b.id} bill={b} accounts={accounts} onMarkPaid={() => markPaid(b)} onEdit={() => openEdit(b)} onDelete={() => deleteBill(b)} onTogglePause={() => toggleActive(b)} />
                ))}
              </div>
            ) : <p className="text-sm text-white/30 text-center py-4">No bills due in the next 30 days.</p>}
          </section>
        </Reveal>

        {/* Section 1 — Full list */}
        <Reveal>
          <section className="rounded-lg border border-white/10 bg-black p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-white/50">{visibleBills.length} bill{visibleBills.length === 1 ? "" : "s"} tracked</p>
            </div>
            {loading ? (
              <p className="text-sm text-white/30 text-center py-6">Loading…</p>
            ) : visibleBills.length ? (
              <div className="space-y-1.5">
                {visibleBills.map((b) => (
                  <BillRow key={b.id} bill={b} accounts={accounts} onMarkPaid={() => markPaid(b)} onEdit={() => openEdit(b)} onDelete={() => deleteBill(b)} onTogglePause={() => toggleActive(b)} onReview={(s) => reviewBill(b, s)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/30 text-center py-6">No recurring bills yet. Add one, or enable AI Auto-Detection and run a scan.</p>
            )}
          </section>
        </Reveal>
          </TabsContent>

          <TabsContent value="allocator" className="space-y-6 mt-4">
            <PaychequeAllocator
              bills={bills}
              vaults={vaults}
              setVaults={setVaults}
              loadingVaults={loadingVaults}
              reloadVaults={loadVaults}
              onAddBill={openAdd}
              onEditBill={openEdit}
              onDeleteBill={deleteBill}
            />
          </TabsContent>
        </Tabs>
      </main>

      <RecurringBillForm open={formOpen} onOpenChange={setFormOpen} bill={editing} accounts={accounts} vaults={vaults} onSaved={loadBills} />
    </div>
  );
}

function fmt(n) { return `$${(n || 0).toFixed(2)}`; }

function SummaryCard({ label, value, tone }) {
  const tones = {
    rose: "border-rose-400/20 text-rose-300",
    amber: "border-amber-400/20 text-amber-300",
    emerald: "border-emerald-400/20 text-emerald-300",
    neutral: "border-white/10 text-zinc-100",
  };
  return (
    <div className={`rounded-lg border bg-black p-3 ${tones[tone]}`}>
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className="text-lg font-mono tabular-nums mt-1">{value}</p>
    </div>
  );
}