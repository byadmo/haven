import React from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useForecast } from "@/lib/forecast-context";

const fmt = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function ChangeChip({ pct }) {
  if (pct === null || isNaN(pct)) return null;
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function MetricsRow({ netWorth, income, expense, incomePct, expensePct, spendRatio }) {
  const fc = useForecast();
  const fp = fc?.point;
  if (fp) { netWorth = fp.netWorth; income = fp.income; }
  const isFuture = !!fc?.isFuture;

  const cards = [
    {
      label: "Net Worth",
      value: fmt(netWorth),
      icon: <Wallet className="h-4 w-4" />,
      accent: "indigo",
      bar: null,
      chip: isFuture ? <span className="text-[10px] font-mono tabular-nums text-emerald-400">T+{fc.timelineIndex} PROJ</span> : null,
      valueColor: netWorth >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      label: "Monthly Income",
      value: fmt(income),
      icon: <TrendingUp className="h-4 w-4" />,
      accent: "emerald",
      bar: Math.min(100, (income / Math.max(1, income + expense)) * 100),
      chip: <ChangeChip pct={incomePct} />,
      valueColor: income <= 0 ? "text-rose-400" : (incomePct != null && incomePct < 0) ? "text-amber-400" : "text-emerald-400",
    },
    {
      label: "Monthly Spend",
      value: fmt(expense),
      icon: <TrendingDown className="h-4 w-4" />,
      accent: "rose",
      bar: Math.min(100, spendRatio * 100),
      chip: <ChangeChip pct={expensePct} />,
      valueColor: expensePct != null && expensePct > 0 ? "text-rose-400" : expensePct != null && expensePct < 0 ? "text-emerald-400" : "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {cards.map((c, i) => {
        const accents = {
          indigo: "text-indigo-300 bg-indigo-500/15",
          emerald: "text-emerald-400 bg-emerald-500/15",
          rose: "text-rose-400 bg-rose-500/15",
        };
        const barColor = {
          indigo: "from-indigo-500 to-violet-400",
          emerald: "from-emerald-500 to-teal-400",
          rose: "from-rose-500 to-orange-400",
        };
        return (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative rounded-lg bg-black border border-white/10 p-2.5 sm:p-4 hover:border-white/30 transition-colors duration-150 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className={`h-5 w-5 sm:h-7 sm:w-7 flex items-center justify-center ${accents[c.accent]} shrink-0`}>{c.icon}</div>
                <span className="text-[9px] sm:text-[11px] uppercase tracking-widest text-white/50 font-medium truncate">{c.label}</span>
              </div>
              {c.chip}
            </div>
            <p className={`text-base sm:text-2xl font-bold font-mono tabular-nums tracking-tight ${c.valueColor}`}>{c.value}</p>
            {c.bar !== null && (
              <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.bar}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${barColor[c.accent]}`}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}