import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BarChart3, Download, CalendarDays, Filter, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { useCurrency } from "@/lib/currency-context";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";

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

const METRICS = [
  { id: "income", label: "Income", color: "#10b981" },
  { id: "expenses", label: "Expenses", color: "#f43f5e" },
  { id: "net", label: "Net Cash Flow", color: "#6366f1" },
  { id: "savings_rate", label: "Savings Rate %", color: "#f59e0b" },
];

const GROUP_BY = [
  { id: "month", label: "Month" },
  { id: "category", label: "Category" },
  { id: "account", label: "Account" },
];

export default function CustomReportEngine() {
  const { transactions, accounts } = useFinanceData();
  const { fmtMoney: fmt } = useCurrency();

  const [dateRange, setDateRange] = useState("6m");
  const [metrics, setMetrics] = useState(["income", "expenses"]);
  const [groupBy, setGroupBy] = useState("month");
  const [chartType, setChartType] = useState("bar");

  // Extract date range boundaries
  const { start, end, months } = useMemo(() => {
    const now = endOfMonth(new Date());
    let s, m;
    switch (dateRange) {
      case "3m": s = startOfMonth(subMonths(now, 2)); m = 3; break;
      case "6m": s = startOfMonth(subMonths(now, 5)); m = 6; break;
      case "12m": s = startOfMonth(subMonths(now, 11)); m = 12; break;
      case "24m": s = startOfMonth(subMonths(now, 23)); m = 24; break;
      default: s = startOfMonth(subMonths(now, 5)); m = 6;
    }
    return { start: s, end: now, months: m };
  }, [dateRange]);

  // Filter transactions by date range
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      try {
        return isWithinInterval(parseISO(t.date), { start, end });
      } catch { return false; }
    });
  }, [transactions, start, end]);

  // Compute report data based on groupBy + metrics
  const reportData = useMemo(() => {
    if (groupBy === "month") {
      const buckets = {};
      for (let i = 0; i < months; i++) {
        const m = subMonths(end, months - 1 - i);
        const key = format(m, "MMM yy");
        buckets[key] = { label: key, income: 0, expenses: 0, count: 0 };
      }

      filtered.forEach((t) => {
        try {
          const d = parseISO(t.date);
          const key = format(d, "MMM yy");
          if (buckets[key]) {
            if (t.amount > 0) buckets[key].income += t.amount;
            else buckets[key].expenses += Math.abs(t.amount);
            buckets[key].count++;
          }
        } catch {}
      });

      return Object.values(buckets).map((b) => ({
        ...b,
        net: b.income - b.expenses,
        savings_rate: b.income > 0 ? ((b.income - b.expenses) / b.income) * 100 : 0,
      }));
    }

    if (groupBy === "category") {
      const cats = {};
      filtered.forEach((t) => {
        const c = t.category || "Uncategorized";
        cats[c] = cats[c] || { label: c, income: 0, expenses: 0, count: 0 };
        if (t.amount > 0) cats[c].income += t.amount;
        else cats[c].expenses += Math.abs(t.amount);
        cats[c].count++;
      });

      return Object.values(cats)
        .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses))
        .map((b) => ({ ...b, net: b.income - b.expenses, savings_rate: 0 }));
    }

    if (groupBy === "account") {
      const accts = {};
      filtered.forEach((t) => {
        const a = t.account_name || t.account_id || "Unknown";
        accts[a] = accts[a] || { label: a, income: 0, expenses: 0, count: 0 };
        if (t.amount > 0) accts[a].income += t.amount;
        else accts[a].expenses += Math.abs(t.amount);
        accts[a].count++;
      });

      return Object.values(accts)
        .sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses))
        .map((b) => ({ ...b, net: b.income - b.expenses, savings_rate: 0 }));
    }

    return [];
  }, [filtered, groupBy, months, end]);

  // Summary stats
  const summary = useMemo(() => {
    const totalIncome = reportData.reduce((s, r) => s + r.income, 0);
    const totalExpenses = reportData.reduce((s, r) => s + r.expenses, 0);
    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
      totalTransactions: filtered.length,
      avgMonthlyIncome: totalIncome / months,
      avgMonthlyExpenses: totalExpenses / months,
    };
  }, [reportData, months, filtered]);

  const handleExportCSV = () => {
    const headers = ["Label", "Income", "Expenses", "Net", "Transactions"];
    const rows = reportData.map((r) =>
      [r.label, r.income.toFixed(2), r.expenses.toFixed(2), r.net.toFixed(2), r.count].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haven-report-${format(start, "yyyy-MM-dd")}-to-${format(end, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isActiveMetric = (id) => metrics.includes(id);
  const toggleMetric = (id) => {
    setMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const ChartComponent = chartType === "bar" ? Bar : Line;
  const ChartContainer = chartType === "bar" ? BarChart : LineChart;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Controls */}
      <motion.div variants={staggerVariants} custom={0} className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-lg p-0.5 border border-white/5">
          {["3m", "6m", "12m", "24m"].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all hover:scale-105 active:scale-95 ${
                dateRange === r
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Group by */}
        <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-lg p-0.5 border border-white/5">
          {GROUP_BY.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupBy(g.id)}
              className={`px-2.5 py-1 rounded-md text-xs transition-all hover:scale-105 active:scale-95 ${
                groupBy === g.id
                  ? "bg-blue-500/10 text-blue-300 border border-blue-500/30"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Chart type */}
        <button
          onClick={() => setChartType(chartType === "bar" ? "line" : "bar")}
          className="px-2.5 py-1 rounded-md text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all"
        >
          {chartType === "bar" ? "Line" : "Bar"}
        </button>

        {/* Export */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-white/40 hover:text-white border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all ml-auto"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </motion.div>

      {/* Metric toggles */}
      <motion.div variants={staggerVariants} custom={1} className="flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.id}
            onClick={() => toggleMetric(m.id)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all hover:scale-105 active:scale-95 ${
              isActiveMetric(m.id)
                ? "bg-white/10 text-white border border-white/20"
                : "text-white/30 border border-white/5 hover:text-white/50"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
            {m.label}
          </button>
        ))}
      </motion.div>

      {/* Summary stat cards */}
      <motion.div variants={staggerVariants} custom={2} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-black p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-[9px] text-white/40 font-mono">Total Income</span>
          </div>
          <p className="text-sm font-mono tabular-nums text-emerald-300">{fmt(summary.totalIncome)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3 w-3 text-rose-400" />
            <span className="text-[9px] text-white/40 font-mono">Total Expenses</span>
          </div>
          <p className="text-sm font-mono tabular-nums text-rose-300">{fmt(summary.totalExpenses)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="h-3 w-3 text-indigo-400" />
            <span className="text-[9px] text-white/40 font-mono">Net Cash Flow</span>
          </div>
          <p className={`text-sm font-mono tabular-nums ${summary.netCashFlow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {fmt(summary.netCashFlow)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 className="h-3 w-3 text-amber-400" />
            <span className="text-[9px] text-white/40 font-mono">Savings Rate</span>
          </div>
          <p className="text-sm font-mono tabular-nums text-amber-300">
            {summary.savingsRate.toFixed(1)}%
          </p>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div variants={staggerVariants} custom={3} className="rounded-xl border border-white/10 bg-black p-4">
        <ResponsiveContainer width="100%" height={280}>
          <ChartContainer data={reportData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis tickFormatter={(v) => fmt(v)} width={56} {...axisProps} />
            <Tooltip formatter={(v, name) => {
              const m = METRICS.find((mm) => mm.id === name);
              return [name === "savings_rate" ? `${v.toFixed(1)}%` : fmt(v), m?.label || name];
            }} {...chartTooltipProps} />

            {metrics.map((m) => {
              const meta = METRICS.find((mm) => mm.id === m);
              if (!meta) return null;
              const ChartShape = chartType === "bar" ? Bar : Line;
              const chartProps = chartType === "bar"
                ? { dataKey: m, fill: meta.color, radius: [4, 4, 0, 0], maxBarSize: 32 }
                : { dataKey: m, stroke: meta.color, strokeWidth: 2, dot: false, type: "monotone" };

              return <ChartShape key={m} {...chartProps} name={m} />;
            })}
          </ChartContainer>
        </ResponsiveContainer>
      </motion.div>

      {/* Data table */}
      <motion.div variants={staggerVariants} custom={4} className="rounded-xl border border-white/10 bg-black p-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/40 border-b border-white/5">
              <th className="text-left py-2 font-mono">{groupBy === "month" ? "Month" : groupBy === "category" ? "Category" : "Account"}</th>
              <th className="text-right py-2 font-mono">Income</th>
              <th className="text-right py-2 font-mono">Expenses</th>
              <th className="text-right py-2 font-mono">Net</th>
              <th className="text-right py-2 font-mono">Txns</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((r, i) => (
              <tr key={r.label} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                <td className="py-2 text-white font-medium">{r.label}</td>
                <td className="py-2 text-right font-mono text-emerald-300">{fmt(r.income)}</td>
                <td className="py-2 text-right font-mono text-rose-300">{fmt(r.expenses)}</td>
                <td className={`py-2 text-right font-mono ${r.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmt(r.net)}
                </td>
                <td className="py-2 text-right font-mono text-white/40">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  );
}