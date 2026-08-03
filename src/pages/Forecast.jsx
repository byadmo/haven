import React from "react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import DashboardHeader from "@/components/finance/DashboardHeader";
import { ForecastProvider } from "@/lib/forecast-context";
import { computeTrajectory } from "@/lib/trajectory";
import TelemetryReadout from "@/components/finance/TelemetryReadout";
import HoverTimeline from "@/components/finance/HoverTimeline";
import ForecastCharts from "@/components/finance/ForecastCharts";
import Reveal from "@/components/finance/Reveal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Forecast() {
  const [txns, setTxns] = React.useState([]);
  const [debts, setDebts] = React.useState([]);
  const [accounts, setAccounts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [method, setMethod] = React.useState("avalanche");
  const [months, setMonths] = React.useState(60);
  const [extra, setExtra] = React.useState(0);

  React.useEffect(() => {
    Promise.all([
      base44.entities.Transaction.list("-date", 500),
      base44.entities.Debt.list("-created_date"),
      base44.entities.Account.list("-created_date"),
    ])
      .then(([t, d, a]) => { setTxns(t); setDebts(d); setAccounts(a); })
      .finally(() => setLoading(false));
  }, []);

  const { series, keyframes, order } = React.useMemo(
    () => computeTrajectory({ debts, accounts, transactions: txns, months, method, extraPayment: extra }),
    [debts, accounts, txns, months, method, extra]
  );

  const debtFreeMonth = series.find((p) => p.debtRemaining <= 0.005)?.month;
  const debtFreeDate = debtFreeMonth != null ? format(series[debtFreeMonth].date, "MMM yyyy") : null;
  const milestoneRows = (keyframes || []).map((m) => ({
    m, label: series[m]?.keyframeLabel || `T+${m}`, date: series[m] ? format(series[m].date, "MMM yyyy") : "",
  }));

  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <DashboardHeader />
      <ForecastProvider forecastData={series}>
        <main className="max-w-6xl mx-auto px-6 sm:px-6 py-10 sm:py-6 space-y-6">
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-black">
              <TelemetryReadout />
              <HoverTimeline />
            </div>
          </Reveal>

          {/* Options */}
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-black p-4 sm:p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">Forecast Controls</h2>
                {debtFreeDate && (
                  <span className="text-[10px] tracking-[0.18em] font-mono uppercase border border-emerald-500/40 text-emerald-400 px-2 py-0.5">
                    Debt Free · {debtFreeDate}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Strategy</Label>
                  <ToggleGroup
                    type="single"
                    value={method}
                    onValueChange={(v) => v && setMethod(v)}
                    className="mt-2 border border-white/10 rounded-md w-full"
                  >
                    <ToggleGroupItem value="avalanche" className="flex-1 text-xs uppercase tracking-widest font-mono">Avalanche</ToggleGroupItem>
                    <ToggleGroupItem value="snowball" className="flex-1 text-xs uppercase tracking-widest font-mono">Snowball</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div>
                  <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Horizon</Label>
                  <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
                    <SelectTrigger className="mt-2 bg-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">1 Year</SelectItem>
                      <SelectItem value="60">5 Years</SelectItem>
                      <SelectItem value="120">10 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-mono">Extra / Month</Label>
                    <span className="text-[11px] font-mono tabular-nums text-emerald-400">
                      ${(extra || 0).toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={[extra]}
                    onValueChange={(v) => setExtra(v[0])}
                    min={0}
                    max={2000}
                    step={50}
                    className="mt-3"
                  />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal><ForecastCharts series={series} order={order} /></Reveal>

          {/* Milestones */}
          <Reveal>
            <div className="rounded-lg border border-white/10 bg-black p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-zinc-100 mb-3">Milestones</h2>
              {milestoneRows.length === 0 ? (
                <p className="text-[11px] uppercase tracking-widest text-white/40">No keyframes projected.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {milestoneRows.map((row) => (
                    <div key={row.m} className="border border-white/10 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">T+{row.m}</span>
                        <span className="text-[10px] font-mono tabular-nums text-white/40">{row.date}</span>
                      </div>
                      <p className="mt-1 text-sm font-mono text-emerald-400">{row.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </main>
      </ForecastProvider>
    </div>
  );
}