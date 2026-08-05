import React from "react";
import {
  CreditCard, Gauge, ShieldCheck, RefreshCw,
  TrendingDown, AlertTriangle, CheckCircle2,
} from "lucide-react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { invokeFunc, money, pct } from "@/lib/dashboard";
import { Loader } from "@/components/dashboard/ui";
import Reveal from "@/components/finance/Reveal";
import { Button } from "@/components/ui/button";

function band(util) {
  if (util == null) return { text: "text-white/40", bar: "bg-zinc-600", label: "Unknown", ring: "border-white/10" };
  if (util < 10) return { text: "text-emerald-400", bar: "bg-emerald-500", label: "Excellent", ring: "border-emerald-500/30" };
  if (util < 30) return { text: "text-emerald-400", bar: "bg-emerald-400", label: "Good", ring: "border-emerald-500/30" };
  if (util < 50) return { text: "text-amber-400", bar: "bg-amber-400", label: "Warning", ring: "border-amber-500/30" };
  if (util < 75) return { text: "text-orange-400", bar: "bg-orange-400", label: "Poor", ring: "border-orange-500/30" };
  return { text: "text-rose-400", bar: "bg-rose-500", label: "Critical", ring: "border-rose-500/30" };
}

export default function CreditUtilization() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    await invokeFunc("calculateCreditUtilization", {}).then(setData).catch(() => {});
    setLoading(false);
  }
  React.useEffect(() => { load(); }, []);

  const overall = data?.overall_utilization ?? null;
  const rating = data?.overall_health_rating;
  const ob = band(overall);
  const cards = data?.cards || [];
  const over30 = cards.filter((c) => (c.utilization ?? 0) >= 30).sort((a, b) => (b.utilization || 0) - (a.utilization || 0));

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader
        actions={
          <Button size="sm" variant="outline" onClick={load} disabled={loading}
            className="border-white/10 text-white/70 hover:text-white hover:border-white/30">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />
      <main className="relative max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-6">
        <Reveal><PageTitle title="Credit Utilization" subtitle="Track how much of your credit limit you're using — keep it under 30%" icon={Gauge} /></Reveal>

        {/* Overall */}
        <Reveal>
          <div className="rounded-2xl border border-white/10 bg-black p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Overall Utilization</p>
                {overall == null ? (
                  <p className="text-2xl font-bold text-white/40">—</p>
                ) : (
                  <p className={`text-4xl font-bold font-mono tabular-nums ${ob.text}`}>{pct(overall)}</p>
                )}
                <p className={`text-[11px] mt-1 ${ob.text}`}>{ob.label}{rating ? ` · ${rating}` : ""}</p>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-[10px] text-white/40 mb-1.5">
                  <span>0%</span><span className="text-amber-400">30%</span><span>100%</span>
                </div>
                <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full ${ob.bar} rounded-full`} style={{ width: `${Math.min(100, overall || 0)}%` }} />
                  <div className="absolute top-0 bottom-0 w-px bg-amber-400/80" style={{ left: "30%" }} />
                </div>
                <p className="text-[10px] text-white/40 mt-1.5">Vertical marker = 30% threshold target.</p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Per-card */}
        <Reveal delay={0.03}>
          <div className="rounded-2xl border border-white/10 bg-black p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-white/50" />
              <h2 className="text-sm font-semibold text-zinc-100">Cards</h2>
            </div>
            {!data ? <Loader /> : cards.length === 0 ? (
              <p className="text-xs text-white/40">No credit card debts detected. Add a debt with "credit" in the name and a credit limit to track utilization.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {cards.map((c) => {
                  const b = band(c.utilization);
                  return (
                    <div key={c.id} className={`rounded-xl border ${b.ring} bg-black p-3.5`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-white font-medium flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-white/40" /> {c.name}</p>
                        <span className={`text-base font-bold font-mono tabular-nums ${b.text}`}>{c.utilization == null ? "—" : pct(c.utilization)}</span>
                      </div>
                      <div className="mb-2">
                        <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full ${b.bar} rounded-full`} style={{ width: `${Math.min(100, c.utilization || 0)}%` }} />
                          <div className="absolute top-0 bottom-0 w-px bg-amber-400/80" style={{ left: "30%" }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/40 font-mono tabular-nums">
                        <span>Balance {money(c.balance)}</span>
                        <span>Limit {money(c.credit_limit)}</span>
                      </div>
                      <p className={`text-[10px] mt-1.5 ${b.text}`}>{b.label}{c.recommended_payment_to_30 > 0 ? ` · pay ${money(c.recommended_payment_to_30)} to reach 30%` : ""}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>

        {/* Recommendations + history */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Reveal delay={0.05}>
            <div className="rounded-2xl border border-white/10 bg-black p-5">
              <div className="flex items-center gap-2 mb-3"><ShieldCheck className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-semibold text-zinc-100">Recommendations</h2></div>
              {overall != null && overall < 30 ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-200">You're below 30% — great. Keep it below 30% to protect and grow your score.</p>
                </div>
              ) : over30.length === 0 ? (
                <p className="text-xs text-white/40">No cards over the 30% threshold right now.</p>
              ) : (
                <div className="space-y-2">
                  {over30.map((c) => (
                    <div key={c.id} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                      <TrendingDown className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-zinc-200">Pay <span className="font-mono text-amber-300">{money(c.recommended_payment_to_30)}</span> on <span className="font-medium text-white">{c.name}</span> to bring it under 30% (currently <span className="font-mono">{pct(c.utilization)}</span>).</p>
                    </div>
                  ))}
                  <p className="text-[11px] text-white/40 pt-1">Tip: pay down balances before statement closing dates, and keep utilization under 10% for the best score impact.</p>
                </div>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.07}>
            <div className="rounded-2xl border border-white/10 bg-black p-5">
              <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-4 w-4 text-white/50" /><h2 className="text-sm font-semibold text-zinc-100">Utilization History</h2></div>
              <p className="text-xs text-white/40">Historical trend will appear here once utilization snapshots are recorded over time.</p>
            </div>
          </Reveal>
        </div>
      </main>
    </div>
  );
}