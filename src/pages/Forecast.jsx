import React from "react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { format } from "date-fns";
import DashboardHeader from "@/components/finance/DashboardHeader";
import { ForecastProvider } from "@/lib/forecast-context";
import { computeTrajectory } from "@/lib/trajectory";
import TelemetryReadout from "@/components/finance/TelemetryReadout";
import HoverTimeline from "@/components/finance/HoverTimeline";
import ForecastCharts from "@/components/finance/ForecastCharts";
import GoalPlanner from "@/components/finance/GoalPlanner";
import Reveal from "@/components/finance/Reveal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { TrendingUp, Flame, Snowflake } from "lucide-react";
import ForecastTip from "@/components/finance/ForecastTip";
import { useCurrency } from "@/lib/currency-context";

export default function Forecast() {
  const { transactions: txns, debts, accounts } = useFinanceData();
  const { fmtMoney: fmt } = useCurrency();
  const [method, setMethod] = React.useState("avalanche");
  const [extra, setExtra] = React.useState(0);
  const [incomeAdjust, setIncomeAdjust] = React.useState(0);

  // Always compute 120-month projection, then auto-size the view to the debt-free date
  const { series: fullSeries, order } = React.useMemo(
    () => computeTrajectory({ debts, accounts, transactions: txns, months: 120, method, extraPayment: extra, incomeAdjust }),
    [debts, accounts, txns, method, extra, incomeAdjust]
  );

  const debtFreeMonth = React.useMemo(
    () => fullSeries.findIndex((p) => p.debtRemaining <= 0.005),
    [fullSeries]
  );
  // Auto-adjust: show up to debt-free month + 6 months padding (min 12)
  const autoMonths = debtFreeMonth >= 0 ? Math.min(120, debtFreeMonth + 7) : 120;
  const series = React.useMemo(() => fullSeries.slice(0, autoMonths), [fullSeries, autoMonths]);

  const debtFreeDate = debtFreeMonth >= 0 && debtFreeMonth < fullSeries.length
    ? format(fullSeries[debtFreeMonth].date, "MMM yyyy") : null;

  const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
  const minTotal = debts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
  const sliderMax = 10000;

  const timeLeft = debtFreeMonth > 0
    ? (Math.floor(debtFreeMonth / 12) > 0 ? `${Math.floor(debtFreeMonth / 12)}y ` : "") + (debtFreeMonth % 12 > 0 ? `${debtFreeMonth % 12}m` : "")
    : null;

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <DashboardHeader />
      <ForecastProvider forecastData={series}>
        <main className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-6 sm:space-y-5">

          {/* Hero Summary */}
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-black p-5 sm:p-6">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-50 mb-1">Your Debt Payoff Plan</h1>
              <p className="text-sm text-white/50 mb-4">See exactly when you'll be debt-free and how to get there faster.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-mono">Total Debt</p>
                  <p className="text-xl sm:text-2xl font-mono tabular-nums text-rose-400">{fmt(totalDebt)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-mono">Debt-Free By</p>
                  <p className="text-xl sm:text-2xl font-mono tabular-nums text-emerald-400">{debtFreeDate || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-mono">Paying Now</p>
                  <p className="text-xl sm:text-2xl font-mono tabular-nums text-zinc-200">{fmt(minTotal + extra)}<span className="text-xs text-white/40">/mo</span></p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-mono">Time Left</p>
                  <p className="text-xl sm:text-2xl font-mono tabular-nums text-zinc-200">{timeLeft || "—"}</p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Goal Setter */}
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-black p-4 sm:p-5">
              <GoalPlanner
                debts={debts}
                accounts={accounts}
                transactions={txns}
                method={method}
                months={120}
                currentExtra={extra}
                onApply={(amt) => setExtra(amt)}
              />
            </div>
          </Reveal>

          {/* Strategy & Payment Controls */}
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-black p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-zinc-100">Tune Your Plan</h2>
                </div>
                <ForecastTip series={series} extra={extra} method={method} />
              </div>

              <div className="space-y-5">
                {/* Strategy */}
                <div>
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">How should we prioritize your debts?</Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setMethod("avalanche")}
                      className={`text-left p-3 rounded-md border transition-colors ${
                        method === "avalanche"
                          ? "border-emerald-500/50 bg-emerald-500/10 text-zinc-100"
                          : "border-white/10 text-white/50 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className="h-3.5 w-3.5" />
                        <span className="text-sm font-semibold">Avalanche</span>
                        {method === "avalanche" && <span className="text-[9px] text-emerald-400 ml-auto">SELECTED</span>}
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">Pays the highest interest debt first. Saves the most money overall.</p>
                    </button>
                    <button
                      onClick={() => setMethod("snowball")}
                      className={`text-left p-3 rounded-md border transition-colors ${
                        method === "snowball"
                          ? "border-sky-500/50 bg-sky-500/10 text-zinc-100"
                          : "border-white/10 text-white/50 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Snowflake className="h-3.5 w-3.5" />
                        <span className="text-sm font-semibold">Snowball</span>
                        {method === "snowball" && <span className="text-[9px] text-sky-400 ml-auto">SELECTED</span>}
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">Pays the smallest balance first. Quick wins to stay motivated.</p>
                    </button>
                  </div>
                </div>

                {/* Extra Payment */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Extra Payment / Month</Label>
                    <span className="text-[11px] font-mono tabular-nums text-emerald-400">{fmt(extra || 0)}</span>
                  </div>
                  <Slider
                    value={[extra]}
                    onValueChange={(v) => setExtra(v[0])}
                    min={0}
                    max={sliderMax}
                    step={50}
                  />
                  <p className="text-[10px] text-white/40 mt-1.5 leading-relaxed">
                    Pay more than the minimum to reach your goal faster. Drag the slider to see the impact.
                  </p>
                </div>

                {/* Income Adjust */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Income Adjustment</Label>
                    <span className={`text-[11px] font-mono tabular-nums ${incomeAdjust >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {incomeAdjust >= 0 ? "+" : ""}{incomeAdjust}%
                    </span>
                  </div>
                  <Slider
                    value={[incomeAdjust]}
                    onValueChange={(v) => setIncomeAdjust(v[0])}
                    min={-50}
                    max={50}
                    step={5}
                  />
                  <p className="text-[10px] text-white/40 mt-1.5 leading-relaxed">
                    Expecting a raise or cut? Adjust to see how income changes affect your payoff date.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Timeline + Snapshot */}
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-black">
              <TelemetryReadout />
              <HoverTimeline />
            </div>
          </Reveal>

          {/* Charts */}
          <Reveal><ForecastCharts series={series} order={order} /></Reveal>

        </main>
      </ForecastProvider>
    </div>
  );
}