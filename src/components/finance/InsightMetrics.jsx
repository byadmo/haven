import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, PiggyBank, Percent } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

export default function InsightMetrics({ income, spending, savings, savingsRate }) {
  const { fmtMoney: money } = useCurrency();
  const toneCls = {
    emerald: "text-emerald-400",
    rose: "text-rose-400",
    indigo: "text-indigo-400",
  };
  const cards = [
    { label: "Income", value: money(income), icon: <TrendingUp className="h-4 w-4" />, tone: "emerald" },
    { label: "Spending", value: money(spending), icon: <TrendingDown className="h-4 w-4" />, tone: "rose" },
    { label: "Net Savings", value: money(savings), icon: <PiggyBank className="h-4 w-4" />, tone: savings >= 0 ? "emerald" : "rose" },
    { label: "Savings Rate", value: `${(savingsRate || 0).toFixed(1)}%`, icon: <Percent className="h-4 w-4" />, tone: "indigo" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-lg bg-black border border-white/10 p-4 hover:border-white/30 transition-colors duration-150"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={toneCls[c.tone]}>{c.icon}</span>
            <span className="text-[11px] uppercase tracking-widest text-white/50">{c.label}</span>
          </div>
          <p className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${toneCls[c.tone]}`}>{c.value}</p>
        </motion.div>
      ))}
    </div>
  );
}