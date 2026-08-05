import React, { useEffect, useState, useMemo } from "react";
import { invokeFunc, money, pct } from "@/lib/dashboard";
import { Loader, Card3, Bar } from "@/components/dashboard/ui";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

// Reads accounts/debts/stocks from the shared FinanceDataContext instead of
// re-listing them (the old version fired 3 redundant concurrent calls here,
// which contributed to rate-limit bursts on dashboard load).
export function useOverviewData(refreshKey, { accounts = [], debts = [], stocks = [] } = {}) {
  const [saving, setSaving] = useState(null);
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    invokeFunc("calculateSavingsRate", {}).then(setSaving).catch(() => {});
    invokeFunc("checkAccountAlerts", {}).then(setAlerts).catch(() => {});
  }, [refreshKey]);

  const cash = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const debt = debts.filter((d) => d.status !== "paid_off").reduce((s, d) => s + (d.current_balance || 0), 0);
  const inv = stocks.reduce((s, x) => s + (x.shares || 0) * (x.avg_buy_price || 0), 0);
  const net = { cash, debt, inv, total: cash + inv - debt };

  return { net, saving, alerts };
}

export function Stat({ label, value, accent }) {
  const color = accent === "emerald" ? "text-emerald-400" : accent === "rose" ? "text-rose-400" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-black p-3">
      <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
      <p className={`text-lg font-bold font-mono tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export function Breakdown({ label, value, color = "bg-zinc-400" }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/50 mb-1"><span>{label}</span><span className="font-mono tabular-nums">{pct(value)}</span></div>
      <Bar value={Math.min(100, value)} max={100} color={color} />
    </div>
  );
}

export function OverviewSavings({ saving }) {
  return (
    <Card3 title="Savings Rate" subtitle="Last 3 months">
      {saving ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold font-mono tabular-nums">{pct(saving.savings_rate)}</p>
            <span className={`text-[11px] flex items-center gap-1 ${saving.trend === "improving" ? "text-emerald-400" : saving.trend === "declining" ? "text-rose-400" : "text-white/40"}`}>
              {saving.trend === "improving" ? <TrendingUp className="h-3 w-3" /> : saving.trend === "declining" ? <TrendingDown className="h-3 w-3" /> : null}
              {saving.trend}
            </span>
          </div>
          <Breakdown label="Spending" value={saving.spending_rate} />
          <Breakdown label="Debt Payoff" value={saving.debt_payoff_rate} color="bg-rose-500" />
          <Breakdown label="Investments" value={saving.investment_rate} color="bg-sky-500" />
          <Breakdown label="Savings" value={saving.savings_rate} color="bg-emerald-500" />
        </div>
      ) : <Loader />}
    </Card3>
  );
}

const FRAMES = [["day", "Day"], ["week", "Week"], ["month", "Month"], ["year", "Year"]];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function heatColor(v, max) {
  return v > 0 ? `rgba(16,185,129,${0.12 + (v / Math.max(max, 1)) * 0.85})` : "rgba(255,255,255,0.04)";
}

export function OverviewHeatmap({ transactions = [] }) {
  // Default "Week", remembered across sessions.
  const [frame, setFrame] = useState(() => {
    try { return sessionStorage.getItem("haven-heat-frame") || "week"; } catch { return "week"; }
  });
  useEffect(() => { try { sessionStorage.setItem("haven-heat-frame", frame); } catch {} }, [frame]);

  const expenses = useMemo(
    () => transactions.filter((t) => t.type === "expense").map((t) => ({ date: t.date, amt: Math.abs(t.amount || 0) })),
    [transactions]
  );

  // Day: hourly buckets for today. Transactions have no time of day, so totals land at noon.
  const day = useMemo(() => {
    const today = dateKey(new Date());
    const hours = Array(24).fill(0);
    expenses.forEach((e) => { if (e.date === today) hours[12] += e.amt; });
    return { cells: hours.map((v, h) => ({ label: `${h}:00`, v })), max: Math.max(1, ...hours), subtitle: "Today · by hour" };
  }, [expenses]);

  // Week: 7 daily totals (Mon–Sun) for the current calendar week.
  const week = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now); monday.setDate(now.getDate() - ((dow + 6) % 7)); monday.setHours(0, 0, 0, 0);
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const cells = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return { key: dateKey(d), label: labels[i] };
    });
    const totals = Array(7).fill(0);
    expenses.forEach((e) => { const idx = cells.findIndex((c) => c.key === e.date); if (idx >= 0) totals[idx] += e.amt; });
    return { cells: cells.map((c, i) => ({ label: c.label, v: totals[i] })), max: Math.max(1, ...totals), subtitle: "This week · daily totals" };
  }, [expenses]);

  // Month: calendar grid for the current month (rows of weeks, Sun–Sat cols).
  const month = useMemo(() => {
    const now = new Date(); const y = now.getFullYear(), m = now.getMonth();
    const firstDow = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const totals = {};
    const prefix = `${y}-${String(m + 1).padStart(2, "0")}-`;
    expenses.forEach((e) => { if (e.date.startsWith(prefix)) totals[e.date] = (totals[e.date] || 0) + e.amt; });
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      const key = `${prefix}${String(d).padStart(2, "0")}`;
      cells.push({ label: String(d), v: totals[key] || 0, key });
    }
    const all = cells.filter(Boolean).map((c) => c.v);
    return { cells, max: Math.max(1, ...all), subtitle: `${MONTHS[m]} ${y} · daily intensity` };
  }, [expenses]);

  // Year: 12 monthly totals (Jan–Dec) for the current year.
  const year = useMemo(() => {
    const y = new Date().getFullYear();
    const totals = Array(12).fill(0);
    expenses.forEach((e) => { const d = new Date(e.date + "T00:00:00"); if (d.getFullYear() === y) totals[d.getMonth()] += e.amt; });
    return { cells: totals.map((v, i) => ({ label: MONTHS[i], v })), max: Math.max(1, ...totals), subtitle: `${y} · monthly totals` };
  }, [expenses]);

  const data = { day, week, month, year }[frame];

  return (
    <Card3 title="Spending Heatmap" subtitle={data.subtitle}>
      <div className="flex items-center gap-1 mb-3">
        {FRAMES.map(([val, lbl]) => (
          <button key={val} onClick={() => setFrame(val)}
            className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded-md transition-colors ${frame === val ? "bg-emerald-500/20 text-emerald-300" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {frame === "month" ? (
        <div>
          <div className="grid grid-cols-7 gap-1 text-[9px] text-white/30 font-mono mb-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {data.cells.map((c, i) => c == null ? (
              <div key={`b${i}`} className="aspect-square rounded bg-white/[0.02]" />
            ) : (
              <div key={c.key || i} title={`${c.label} — ${money(c.v)}`}
                className="aspect-square rounded text-[8px] font-mono tabular-nums flex items-center justify-center"
                style={{ background: heatColor(c.v, data.max) }}>
                <span className="text-white/40">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : frame === "day" ? (
        <div>
          <div className="flex gap-1 h-10 items-end">
            {data.cells.map((c, i) => (
              <div key={i} title={`${c.label} — ${money(c.v)}`}
                className="flex-1 rounded-sm"
                style={{ height: `${8 + (c.v / data.max) * 32}px`, background: heatColor(c.v, data.max) }} />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-white/30 font-mono pt-1">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
          <p className="text-[9px] text-white/30 pt-1">Transactions don't record time of day, so daily totals land at noon.</p>
        </div>
      ) : (
        <div className="flex gap-1">
          {data.cells.map((c, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div title={`${c.label} — ${money(c.v)}`}
                className="w-full rounded-sm"
                style={{ height: frame === "year" ? 28 : 20, background: heatColor(c.v, data.max) }} />
              <span className="text-[9px] text-white/30 font-mono">{c.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card3>
  );
}

export function OverviewAlerts({ alerts }) {
  return (
    <Card3 title="Account Balance Alerts">
      {!alerts ? <Loader /> : alerts.count === 0 ? (
        <p className="text-xs text-emerald-400 flex items-center gap-2"><Wallet className="h-4 w-4" /> All accounts healthy — no alerts triggered.</p>
      ) : (
        <div className="space-y-2">
          {alerts.triggered.map((a) => (
            <div key={a.alert_id} className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-white font-medium">{a.account_name} · {a.threshold_type === "minimum_balance" ? `Below ${money(a.threshold_value)}` : `Dropped ${a.drop_percentage}%`}</p>
                <p className="text-[11px] text-white/50">Balance {money(a.current_balance)} — {a.recommended_action}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card3>
  );
}

// Standalone tab composition (kept for compatibility — Dashboard now composes
// the pieces directly above the tab bar).
export default function OverviewTab({ refreshKey }) {
  const { net, saving, alerts } = useOverviewData(refreshKey);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Stat label="Net Worth" value={net ? money(net.total) : "—"} accent="emerald" />
        <Stat label="Cash" value={net ? money(net.cash) : "—"} />
        <Stat label="Investments" value={net ? money(net.inv) : "—"} />
        <Stat label="Debt" value={net ? money(net.debt) : "—"} accent="rose" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverviewSavings saving={saving} />
        <OverviewHeatmap />
      </div>
      <OverviewAlerts alerts={alerts} />
    </div>
  );
}