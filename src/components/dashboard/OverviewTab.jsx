import React, { useEffect, useState } from "react";
import { invokeFunc, money, pct } from "@/lib/dashboard";
import { Loader, Card3, Bar } from "@/components/dashboard/ui";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

// Reads accounts/debts/stocks from the shared FinanceDataContext instead of
// re-listing them (the old version fired 3 redundant concurrent calls here,
// which contributed to rate-limit bursts on dashboard load).
export function useOverviewData(refreshKey, { accounts = [], debts = [], stocks = [] } = {}) {
  const [saving, setSaving] = useState(null);
  const [heat, setHeat] = useState(null);
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    invokeFunc("calculateSavingsRate", {}).then(setSaving).catch(() => {});
    invokeFunc("getSpendingHeatmap", {}).then(setHeat).catch(() => {});
    invokeFunc("checkAccountAlerts", {}).then(setAlerts).catch(() => {});
  }, [refreshKey]);

  const cash = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const debt = debts.filter((d) => d.status !== "paid_off").reduce((s, d) => s + (d.current_balance || 0), 0);
  const inv = stocks.reduce((s, x) => s + (x.shares || 0) * (x.avg_buy_price || 0), 0);
  const net = { cash, debt, inv, total: cash + inv - debt };

  return { net, saving, heat, alerts };
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

export function OverviewHeatmap({ heat }) {
  const heatMax = heat ? Math.max(1, ...heat.matrix.flat()) : 1;
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <Card3 title="Spending Heatmap" subtitle={heat ? `Peak: ${heat.peak_spending_day} · Quietest: ${heat.quietest_day}` : ""}>
      {heat ? (
        <div className="space-y-1">
          {heat.matrix.map((row, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="w-8 text-[10px] text-white/40 font-mono">{dow[i]}</span>
              <div className="flex gap-px flex-1">
                {row.map((v, h) => {
                  const intensity = v / heatMax;
                  return (
                    <div key={h} title={`${dow[i]} ${h}:00 — ${money(v)}`}
                      className="h-3 flex-1 rounded-[2px]"
                      style={{ background: v > 0 ? `rgba(16,185,129,${0.15 + intensity * 0.85})` : "rgba(255,255,255,0.04)" }} />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-between text-[9px] text-white/30 font-mono pt-1">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </div>
      ) : <Loader />}
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
  const { net, saving, heat, alerts } = useOverviewData(refreshKey);
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
        <OverviewHeatmap heat={heat} />
      </div>
      <OverviewAlerts alerts={alerts} />
    </div>
  );
}