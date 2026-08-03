import React from "react";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";

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
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function MetricsRow({ netWorth, income, expense, incomePct, expensePct, spendRatio }) {
  const cards = [
    {
      label: "Net Worth",
      value: fmt(netWorth),
      icon: <Wallet className="h-4 w-4" />,
      accent: "indigo",
      bar: null,
      chip: null,
    },
    {
      label: "Monthly Income",
      value: fmt(income),
      icon: <TrendingUp className="h-4 w-4" />,
      accent: "emerald",
      bar: Math.min(100, (income / Math.max(1, income + expense)) * 100),
      chip: <ChangeChip pct={incomePct} />,
    },
    {
      label: "Monthly Spend",
      value: fmt(expense),
      icon: <TrendingDown className="h-4 w-4" />,
      accent: "rose",
      bar: Math.min(100, spendRatio * 100),
      chip: <ChangeChip pct={expensePct} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            className="relative rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-4 shadow-lg shadow-black/30 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accents[c.accent]}`}>{c.icon}</div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{c.label}</span>
              </div>
              {c.chip}
            </div>
            <p className="text-2xl font-bold tabular-nums text-zinc-50">{c.value}</p>
            {c.bar !== null && (
              <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
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