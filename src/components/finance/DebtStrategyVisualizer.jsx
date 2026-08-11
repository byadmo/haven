import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingDown, Zap, Snowflake, DollarSign, CalendarDays, ArrowRight } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { useCurrency } from "@/lib/currency-context";
import { computeTrajectory } from "@/lib/trajectory";
import { format, addMonths } from "date-fns";

const staggerVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const axisProps = {
  stroke: "rgba(255,255,255,0.2)",
  tick: { fontSize: 10, fill: "rgba(255,255,255,0.4)" },
  tickLine: false,
  axisLine: { stroke: "rgba(255,255,255,0.08)" },
};

const chartTooltipProps = {
  contentStyle: {
    background: "rgba(0,0,0,0.9)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 11,
    color: "#fff",
  },
  labelStyle: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
};

export default function DebtStrategyVisualizer({ debts, accounts, transactions }) {
  const { fmtMoney: fmt } = useCurrency();
  const [method, setMethod] = useState("avalanche");
  const [showComparison, setShowComparison] = useState(true);

  // Compute both strategies
  const { avalanche, snowball } = useMemo(() => {
    const opts = { debts, accounts, transactions, months: 120 };

    const ava = computeTrajectory({ ...opts, method: "avalanche" });
    const sno = computeTrajectory({ ...opts, method: "snowball" });

    return { avalanche: ava, snowball: sno };
  }, [debts, accounts, transactions]);

  const current = method === "avalanche" ? avalanche : snowball;
  const other = method === "avalanche" ? snowball : avalanche;

  // Find payoff month
  const currentPayoffIdx = current?.series?.findIndex((p) => p.debtRemaining <= 0.005) ?? -1;
  const otherPayoffIdx = other?.series?.findIndex((p) => p.debtRemaining <= 0.005) ?? -1;

  const currentPayoffDate = currentPayoffIdx >= 0
    ? format(addMonths(new Date(), currentPayoffIdx), "MMM yyyy")
    : "10+ years";
  const otherPayoffDate = otherPayoffIdx >= 0
    ? format(addMonths(new Date(), otherPayoffIdx), "MMM yyyy")
    : "10+ years";

  const monthsSaved = otherPayoffIdx >= 0 && currentPayoffIdx >= 0
    ? otherPayoffIdx - currentPayoffIdx
    : 0;

  // Interest comparison
  const currentInterest = current?.series?.[currentPayoffIdx >= 0 ? currentPayoffIdx : current?.series?.length - 1]?.totalInterest ?? 0;
  const otherInterest = other?.series?.[otherPayoffIdx >= 0 ? otherPayoffIdx : other?.series?.length - 1]?.totalInterest ?? 0;
  const interestSaved = Math.max(0, otherInterest - currentInterest);

  if (!current?.series?.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-black p-5 text-center">
        <p className="text-sm text-white/40">Add debts to see strategy comparison</p>
      </div>
    );
  }

  const chartData = current.series
    .filter((_, i) => i % 3 === 0 || i === current.series.length - 1)
    .map((p) => ({
      month: format(addMonths(new Date(), p.month), "MMM yy"),
      [method === "avalanche" ? "avalanche" : "snowball"]: Math.max(0, p.debtRemaining),
      [method === "avalanche" ? "snowball" : "avalanche"]: Math.max(0, other.series[p.month]?.debtRemaining ?? 0),
    }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Method selector + summary */}
      <motion.div variants={staggerVariants} custom={0} className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setMethod("avalanche")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
            method === "avalanche"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-white/10 text-white/50 hover:text-white"
          }`}
        >
          <Zap className="h-3.5 w-3.5" /> Avalanche
        </button>
        <button
          onClick={() => setMethod("snowball")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
            method === "snowball"
              ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
              : "border-white/10 text-white/50 hover:text-white"
          }`}
        >
          <Snowflake className="h-3.5 w-3.5" /> Snowball
        </button>
        <div className="flex items-center gap-3 ml-auto text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-white/40">Avalanche</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-white/40">Snowball</span>
          </div>
        </div>
      </motion.div>

      {/* Key comparison metrics */}
      <motion.div variants={staggerVariants} custom={1} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[9px] uppercase tracking-wider text-white/40 font-mono">Payoff date</p>
          <p className="text-sm font-mono tabular-nums text-emerald-300 mt-0.5">{currentPayoffDate}</p>
          {monthsSaved > 0 && (
            <p className="text-[9px] text-emerald-400/60 mt-0.5">
              {monthsSaved}mo sooner than {otherPayoffDate}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-[9px] uppercase tracking-wider text-white/40 font-mono">Interest paid</p>
          <p className="text-sm font-mono tabular-nums text-blue-300 mt-0.5">{fmt(currentInterest)}</p>
          {interestSaved > 0 && (
            <p className="text-[9px] text-emerald-400/60 mt-0.5">Save {fmt(interestSaved)}</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-black p-3">
          <p className="text-[9px] uppercase tracking-wider text-white/40 font-mono">Status</p>
          <p className={`text-sm font-mono mt-0.5 ${currentPayoffIdx >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
            {currentPayoffIdx >= 0 ? "Debt-free ✓" : "In progress"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black p-3">
          <p className="text-[9px] uppercase tracking-wider text-white/40 font-mono">Total payments</p>
          <p className="text-sm font-mono tabular-nums text-white mt-0.5">
            {fmt(current?.series?.[0]?.debtRemaining ?? 0)}
          </p>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div variants={staggerVariants} custom={2} className="rounded-xl border border-white/10 bg-black p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white">Debt trajectory comparison</h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis tickFormatter={(v) => fmt(v)} width={56} {...axisProps} />
            <Tooltip formatter={(v) => fmt(v)} {...chartTooltipProps} />
            <Area type="monotone" dataKey="avalanche" name="Avalanche" stroke="#10b981" fill="rgba(16,185,129,0.08)" strokeWidth={2} />
            <Area type="monotone" dataKey="snowball" name="Snowball" stroke="#3b82f6" fill="rgba(59,130,246,0.05)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}