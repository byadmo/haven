import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { invokeFunc, money } from "@/lib/dashboard";
import { Loader, Card3 } from "@/components/dashboard/ui";
import { Flame, Trophy, Clock, Calendar, TrendingDown, Sparkles } from "lucide-react";
import AskAI from "@/components/finance/AskAI";
import { EmptyDebts } from "@/components/shared/EmptyStates";
import { debtFreeCountdown } from "@/lib/formatDates";

export default function DebtTab({ refreshKey }) {
  const [interest, setInterest] = useState(null);
  const [strat, setStrat] = useState(null);
  const [extra, setExtra] = useState(0);
  const [proj, setProj] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    invokeFunc("calculateInterestAccrual", {}).then(setInterest).catch(() => {});
  }, [refreshKey]);

  // Debounced so dragging the "extra/month" slider doesn't fire two backend
  // calls on every step (which trips the platform rate limit).
  useEffect(() => {
    const t = setTimeout(() => {
      invokeFunc("projectDebtFreeDate", { extra_payment: extra }).then(setProj).catch(() => {});
      invokeFunc("comparePayoffStrategies", { extra_payment: extra }).then(setStrat).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [refreshKey, extra]);

  // Debt-free countdown from the projection
  const countdown = proj?.debt_free_date ? debtFreeCountdown(proj.debt_free_date) : null;

  // Auto-open add form if ?add=1
  useEffect(() => {
    if (searchParams.get("add") === "1") {
      // This would open a modal — but we handle it via the existing system
    }
  }, [searchParams]);

  const hasDebts = interest?.debts?.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-white/40">Debt Overview</p>
        <AskAI path="/debts" />
      </div>

      {!hasDebts && !interest ? (
        <Loader />
      ) : !hasDebts ? (
        <EmptyDebts />
      ) : (
        <>
          {/* Debt-Free Countdown */}
          {countdown && !countdown.isFree && (
            <Card3 title="Debt-Free Countdown" subtitle="Days until you're debt-free">
              <div className="flex items-center justify-center gap-6 py-4">
                {countdown.years > 0 && (
                  <div className="text-center">
                    <p className="text-4xl font-bold font-mono tabular-nums text-emerald-400">{countdown.years}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">{countdown.years === 1 ? "Year" : "Years"}</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-4xl font-bold font-mono tabular-nums text-emerald-400">{countdown.months}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Months</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold font-mono tabular-nums text-emerald-400">{countdown.days}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Days</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-white/40">
                <Calendar className="h-3 w-3" />
                <span>Target: {proj?.debt_free_date}</span>
                {proj?.months_to_debt_free && (
                  <span className="ml-2">· {proj.months_to_debt_free} months total</span>
                )}
              </div>
            </Card3>
          )}

          {countdown?.isFree && (
            <Card3 title="Debt-Free! 🎉" subtitle="You've reached your debt-free goal">
              <div className="flex items-center justify-center py-4">
                <div className="text-center">
                  <Trophy className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                  <p className="text-lg font-semibold text-emerald-300">You're debt-free!</p>
                  <p className="text-xs text-white/40 mt-1">All liabilities cleared.</p>
                </div>
              </div>
            </Card3>
          )}

          <Card3 title="Interest Accrual" subtitle="Cost of waiting, updated live">
            {!interest ? <Loader /> : (
              <>
                <div className="flex items-center gap-3 mb-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                  <Flame className="h-6 w-6 text-rose-400" />
                  <div>
                    <p className="text-2xl font-bold font-mono tabular-nums text-rose-400">{money(interest.total_daily_interest)}</p>
                    <p className="text-[11px] text-white/50">Every day you wait costs {money(interest.cost_of_waiting_per_day)} in interest</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {interest.debts.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-xs text-white">{d.name}</p>
                        <p className="text-[10px] text-white/40 font-mono">{money(d.balance)} · {d.apr}% APR</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono tabular-nums text-rose-400">{money(d.daily_interest)}/day</p>
                        <p className="text-[10px] text-white/40 font-mono tabular-nums">{money(d.monthly_projection)}/mo</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Interest saved tracker */}
                {interest.total_interest_saved > 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                    <TrendingDown className="h-4 w-4 text-emerald-400" />
                    <p className="text-xs text-zinc-200">You've saved <span className="font-mono text-emerald-400">{money(interest.total_interest_saved)}</span> in interest by paying extra</p>
                  </div>
                )}
              </>
            )}
          </Card3>

          <Card3 title="Debt-Free Projection" subtitle="Minimum payments vs accelerated">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] text-white/50">Extra/month:</span>
              <input type="range" min={0} max={2000} step={50} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="flex-1 accent-emerald-500" />
              <span className="text-xs font-mono tabular-nums text-emerald-400 w-16 text-right">{money(extra)}</span>
            </div>
            {!proj ? <Loader /> : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-white/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Current trajectory</p>
                  <p className="text-base font-semibold text-white">{proj.base_interest != null ? proj.debt_free_date : "—"}</p>
                  <p className="text-[11px] text-white/50 font-mono">Interest {money(proj.base_interest)} · {proj.months_to_debt_free} mo</p>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-400/70">With +{money(extra)}/mo</p>
                  <p className="text-base font-semibold text-emerald-400">{proj.debt_free_date}</p>
                  <p className="text-[11px] text-white/50 font-mono">Interest {money(proj.total_interest)} · save {money(proj.interest_saved_by_extra)}</p>
                </div>
              </div>
            )}
          </Card3>

          <Card3 title="Snowball vs Avalanche">
            {!strat ? <Loader /> : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StrategyCol name="Snowball" icon={<Trophy className="h-3.5 w-3.5" />} data={strat.snowball} accent="sky" rec={strat.recommendation === "snowball"} />
                  <StrategyCol name="Avalanche" icon={<Flame className="h-3.5 w-3.5" />} data={strat.avalanche} accent="emerald" rec={strat.recommendation === "avalanche"} />
                </div>
                <p className="text-[11px] text-white/50 mt-3">
                  Avalanche saves <span className="text-emerald-400 font-mono">{money(strat.interest_saved_by_avalanche)}</span> in interest; Snowball finishes {strat.time_saved_by_snowball > 0 ? `${strat.time_saved_by_snowball} mo` : "0 mo"} sooner.
                  Recommended for your {strat.risk_tolerance} profile: <span className="font-semibold text-emerald-400">{strat.recommendation}</span>.
                </p>
              </>
            )}
          </Card3>
        </>
      )}
    </div>
  );
}

function StrategyCol({ name, icon, data, accent, rec }) {
  const c = accent === "emerald" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-sky-500/30 bg-sky-500/5 text-sky-400";
  return (
    <div className={`rounded-lg border p-3 ${c} ${rec ? "ring-1 ring-emerald-500/40" : ""}`}>
      <p className="text-xs font-semibold flex items-center gap-1">{icon} {name} {rec && <span className="text-[9px] px-1 rounded bg-emerald-500/20">REC</span>}</p>
      <p className="text-base font-bold text-white mt-1 font-mono tabular-nums">{data.debt_free_date}</p>
      <p className="text-[11px] text-white/50 font-mono tabular-nums">{data.months_to_payoff} months</p>
      <p className="text-[11px] text-white/50 font-mono tabular-nums">{money(data.total_interest)} interest</p>
    </div>
  );
}