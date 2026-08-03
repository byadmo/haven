import React from "react";
import { base44 } from "@/api/base44Client";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format, parseISO, eachMonthOfInterval, endOfMonth } from "date-fns";
import { BarChart3, Loader2 } from "lucide-react";

const money = (v) =>
  (v || 0).toLocaleString(undefined, {
    style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0,
  });

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs">
      <p className="text-white/50 mb-1.5 font-mono">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono" style={{ color: p.color }}>
          {p.name}: {money(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function ReportTrends() {
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [txns, payments] = await Promise.all([
          base44.entities.Transaction.list("-date", 10000),
          base44.entities.DebtPayment.list("-date", 10000),
        ]);

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        const end = endOfMonth(now);
        const months = eachMonthOfInterval({ start, end });

        const monthIdx = {};
        months.forEach((m, i) => {
          monthIdx[`${m.getFullYear()}-${String(m.getMonth()).padStart(2, "0")}`] = i;
        });

        const buckets = months.map((m) => ({
          month: format(m, "MMM yy"),
          income: 0,
          expenses: 0,
          savings: 0,
          debtPaid: 0,
        }));

        txns.forEach((t) => {
          try {
            const d = parseISO(t.date);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
            const idx = monthIdx[key];
            if (idx === undefined) return;
            if (t.type === "income") buckets[idx].income += t.amount || 0;
            else buckets[idx].expenses += t.amount || 0;
          } catch {}
        });

        payments.forEach((p) => {
          try {
            const d = parseISO(p.date);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
            const idx = monthIdx[key];
            if (idx === undefined) return;
            buckets[idx].debtPaid += p.amount || 0;
          } catch {}
        });

        buckets.forEach((b) => { b.savings = b.income - b.expenses; });
        setData(buckets);
      } catch (e) {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasData = data.some((d) => d.income > 0 || d.expenses > 0 || d.debtPaid > 0);

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Trend Analysis</h3>
      </div>
      <p className="text-xs text-white/40 mb-4">
        12-month income vs. spending and debt repayment trends.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading trends…
        </div>
      ) : !hasData ? (
        <p className="text-xs text-white/40 text-center py-8">Not enough data to show trends yet.</p>
      ) : (
        <div className="space-y-6">
          <div>
            <p className="text-[11px] text-white/50 mb-2 uppercase tracking-wider">Income vs. Expenses</p>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v)} width={50} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} barSize={14} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} barSize={14} />
                <Line dataKey="savings" name="Savings" stroke="#6366f1" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                <span className="text-[10px] text-white/40">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-rose-500" />
                <span className="text-[10px] text-white/40">Expenses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-indigo-500" />
                <span className="text-[10px] text-white/40">Savings</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-white/50 mb-2 uppercase tracking-wider">Debt Repayment</p>
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v)} width={50} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="debtPaid" name="Debt Paid" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={16} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm bg-amber-500" />
                <span className="text-[10px] text-white/40">Debt Payments</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}