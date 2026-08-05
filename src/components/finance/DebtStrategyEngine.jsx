import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card } from "@/components/ui/card";
import { simulateFlatRun } from "@/lib/trajectory";
import { format } from "date-fns";
import { Sparkles, TrendingDown, CalendarCheck, ArrowRight, Wand2, PiggyBank } from "lucide-react";
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useCurrency } from "@/lib/currency-context";

export default function DebtStrategyEngine({ debts, monthlySurplus, forcedSurplus, forcedMethod }) {
  const { fmtMoney: fmt, fmtAxis } = useCurrency();
  const [method, setMethod] = React.useState("avalanche");
  const [surplus, setSurplus] = React.useState(monthlySurplus || 0);
  const [boost, setBoost] = React.useState(0);

  React.useEffect(() => {
    if (monthlySurplus) setSurplus(monthlySurplus);
  }, [monthlySurplus]);

  // Apply externally-forced surplus/method ({value, nonce} objects so re-applying
  // the same value still re-triggers the effect and resets a manually-moved slider).
  React.useEffect(() => {
    if (forcedSurplus && typeof forcedSurplus.value === "number") setSurplus(forcedSurplus.value);
  }, [forcedSurplus]);
  React.useEffect(() => {
    if (forcedMethod && (forcedMethod.value === "avalanche" || forcedMethod.value === "snowball")) setMethod(forcedMethod.value);
  }, [forcedMethod]);

  // Single unified run per scenario — replaces 5 separate simulations.
  const baseRun = React.useMemo(
    () => simulateFlatRun(debts, surplus, method),
    [debts, surplus, method]
  );
  const optRun = React.useMemo(
    () => simulateFlatRun(debts, surplus + boost, method),
    [debts, surplus, boost, method]
  );
  const projection = baseRun;
  const savings = {
    baseMonths: baseRun.months,
    baseInterest: baseRun.totalInterest,
    optMonths: optRun.months,
    optInterest: optRun.totalInterest,
    monthsFaster: Math.max(0, baseRun.months - optRun.months),
    interestSaved: Math.max(0, baseRun.totalInterest - optRun.totalInterest),
  };
  const chartData = React.useMemo(() => {
    const maxM = Math.max(baseRun.series.length - 1, optRun.series.length - 1, 1);
    const out = [];
    for (let i = 0; i <= maxM; i++) {
      out.push({
        month: i,
        base: baseRun.series[i] ? Math.max(0, baseRun.series[i].balance) : 0,
        accelerated: optRun.series[i] ? Math.max(0, optRun.series[i].balance) : 0,
      });
    }
    return out;
  }, [baseRun, optRun]);

  const maxMonth = chartData.length ? chartData[chartData.length - 1].month : 0;
  const years = Math.floor(projection.months / 12);
  const remainMonths = projection.months % 12;
  const payoffLabel = projection.months
    ? `${years > 0 ? `${years}y ` : ""}${remainMonths}mo`
    : "—";

  const totalDebt = projection.totalDebt || 0;
  const horizonMonths = 120;
  const progress = projection.months
    ? Math.min(100, Math.round(((horizonMonths - projection.months) / horizonMonths) * 100))
    : 0;

  const totalInterest = projection.totalInterest || 0;
  const optInterest = savings.optInterest || 0;

  return (
    <Card className="p-5 bg-zinc-900/60 backdrop-blur-xl border-zinc-800 shadow-2xl shadow-black/40">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-violet-300" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-zinc-100">Debt Strategy Engine</h2>
            <p className="text-xs text-zinc-500">Simulate your path to debt-free — pick Avalanche (highest interest first) or Snowball (smallest balance first) to see your payoff timeline, interest cost, and recommended payment order.</p>
          </div>
        </div>
        <ToggleGroup type="single" value={method} onValueChange={(v) => v && setMethod(v)} className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-1 self-start">
          <ToggleGroupItem
            value="avalanche"
            className="data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50 text-zinc-400 px-3 py-1.5 text-xs rounded-md transition-all"
          >
            Avalanche
          </ToggleGroupItem>
          <ToggleGroupItem
            value="snowball"
            className="data-[state=on]:bg-zinc-700 data-[state=on]:text-zinc-50 text-zinc-400 px-3 py-1.5 text-xs rounded-md transition-all"
          >
            Snowball
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3.5">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Months Until Free</p>
          <p className="text-2xl font-bold text-zinc-50 tabular-nums">{payoffLabel}</p>
        </div>
        <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3.5">
          <div className="flex items-center gap-1.5 mb-1 text-zinc-500">
            <CalendarCheck className="h-3 w-3" />
            <p className="text-[11px] uppercase tracking-wider">Debt-Free Date</p>
          </div>
          <p className="text-lg font-bold text-emerald-400 tabular-nums">
            {projection.debtFreeDate ? format(projection.debtFreeDate, "MMM yyyy") : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-3.5">
          <div className="flex items-center gap-1.5 mb-1 text-zinc-500">
            <PiggyBank className="h-3 w-3" />
            <p className="text-[11px] uppercase tracking-wider">Interest Cost</p>
          </div>
          <p className="text-lg font-bold text-orange-400 tabular-nums">{fmt(totalInterest)}</p>
        </div>
      </div>

      {/* Monthly surplus input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400">Monthly surplus available</label>
          <span className="text-sm font-semibold text-zinc-100 tabular-nums">
            {fmt(surplus)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={10000}
          step={10}
          value={surplus}
          onChange={(e) => setSurplus(Number(e.target.value))}
          className="w-full h-1.5 rounded-full accent-violet-500 bg-zinc-800 cursor-pointer"
        />
      </div>

      {/* Animated progress bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[11px] text-zinc-500 mb-1.5">
          <span>10 yrs (reference)</span>
          <span>{progress}% faster</span>
        </div>
        <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-400"
          />
        </div>
      </div>

      {/* Payoff order */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Recommended Payoff Order</p>
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {projection.order.map((d, i) => (
              <motion.div
                key={d.id || d.name}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-xs"
              >
                <span className="h-5 w-5 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center font-semibold text-[10px]">
                  {i + 1}
                </span>
                <span className="text-zinc-300 font-medium flex-1">{d.name}</span>
                <span className="text-zinc-500 tabular-nums">
                  {fmt(d.current_balance || 0)}
                </span>
                {d.interest_rate > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 tabular-nums">
                    {d.interest_rate}%{d.interest_type && d.interest_type !== "None" ? ` ${d.interest_type}` : ""}
                  </span>
                )}
                {i < projection.order.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-700 hidden sm:block" />}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2.5 italic">
          {method === "avalanche"
            ? "Avalanche: highest interest rate first — saves the most money."
            : "Snowball: lowest balance first — fastest wins, builds momentum."}
        </p>
      </div>

      {/* What-If Optimizer */}
      <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="h-4 w-4 text-violet-300" />
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">What-If Optimizer</p>
          <p className="text-[10px] text-zinc-500 mt-1">Drag the boost slider to see how adding extra money each month shortens your payoff time and saves interest.</p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-zinc-400">Extra monthly boost</label>
            <span className="text-sm font-semibold text-violet-200 tabular-nums">+{fmt(boost)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1500}
            step={25}
            value={boost}
            onChange={(e) => setBoost(Number(e.target.value))}
            className="w-full h-1.5 rounded-full accent-fuchsia-500 bg-zinc-800 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-3">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Current Path</p>
            <p className="text-base font-bold text-zinc-200 tabular-nums">
              {savings.baseMonths ? `${savings.baseMonths} mo` : "—"}
            </p>
            <p className="text-[11px] text-rose-300/80 tabular-nums mt-0.5">{fmt(savings.baseInterest)} interest</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 mb-1">Optimized Path</p>
            <p className="text-base font-bold text-emerald-300 tabular-nums">
              {savings.optMonths ? `${savings.optMonths} mo` : "—"}
            </p>
            <p className="text-[11px] text-emerald-400/80 tabular-nums mt-0.5">{fmt(optInterest)} interest</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-3 text-[10px] text-zinc-400 mb-1">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Base trajectory</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" />Accelerated (+{fmt(boost)}/mo)</span>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" type="number" domain={[0, maxMonth]} allowDecimals={false} stroke="#52525b" fontSize={10} tickFormatter={(m) => `${m}mo`} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} width={44} tickFormatter={(v) => fmtAxis(v)} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11 }} labelFormatter={(m) => `Month ${m}`} formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="base" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="accelerated" stroke="#34d399" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <AnimatePresence>
          {boost > 0 && savings.monthsFaster > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-xs text-zinc-200 leading-relaxed">
                By adding{" "}
                <span className="font-semibold text-violet-300 tabular-nums">+{fmt(boost)}/mo</span>, you become debt-free{" "}
                <span className="font-semibold text-emerald-300 tabular-nums">{savings.monthsFaster} months faster</span> and save{" "}
                <span className="font-semibold text-emerald-300 tabular-nums">{fmt(savings.interestSaved)}</span> in interest.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}