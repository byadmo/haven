import React from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Landmark, ArrowRight, Briefcase } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

const SHOW_INVEST_KEY = "dd.accounts.showInvestments";

export default function AccountsSummary() {
  const navigate = useNavigate();
  const { fmtMoney: fmt } = useCurrency();
  const [showInvestments, setShowInvestments] = React.useState(
    () => localStorage.getItem(SHOW_INVEST_KEY) === "1"
  );
  function toggleInvestments() {
    setShowInvestments((prev) => {
      const next = !prev;
      localStorage.setItem(SHOW_INVEST_KEY, next ? "1" : "0");
      return next;
    });
  }
  const [accounts, setAccounts] = React.useState([]);
  const [stocks, setStocks] = React.useState([]);
  const [debts, setDebts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const [a, s, d] = await Promise.all([
        base44.entities.Account.list("-created_date"),
        base44.entities.Stock.list("-created_date").catch(() => []),
        base44.entities.Debt.list("-created_date").catch(() => []),
      ]);
      setAccounts(a);
      setStocks(s);
      setDebts(d);
      setLoading(false);
    }
    load();
    const unsubAcct = base44.entities.Account.subscribe(() => {
      base44.entities.Account.list("-created_date").then(setAccounts).catch(() => {});
    });
    const unsubDebt = base44.entities.Debt.subscribe(() => {
      base44.entities.Debt.list("-created_date").then(setDebts).catch(() => {});
    });
    return () => { unsubAcct(); unsubDebt(); };
  }, []);

  const visibleAccounts = accounts.filter((a) => a.show_in_summary !== false);
  const bankTotal = visibleAccounts.reduce((s, a) => s + (a.balance || 0), 0);

  const investmentGroups = React.useMemo(() => {
    const map = {};
    stocks.forEach((st) => {
      const k = st.account || "Non-Registered";
      (map[k] = map[k] || { account: k, value: 0 });
      map[k].value += (st.shares || 0) * (st.avg_buy_price || 0);
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [stocks]);
  const investTotal = investmentGroups.reduce((s, g) => s + g.value, 0);

  const activeDebts = debts.filter(
    (d) => (d.status || "active") !== "paid_off" && d.show_in_accounts === true
  );
  const debtsTotal = activeDebts.reduce((s, d) => s + (d.current_balance || 0), 0);

  const total = bankTotal + (showInvestments ? investTotal : 0) - debtsTotal;
  const itemCount = visibleAccounts.length + investmentGroups.length + activeDebts.length;

  const previewCards = [
    ...visibleAccounts.map((a) => ({
      key: a.id,
      label: a.type || "chequing",
      name: a.name,
      value: fmt(a.balance || 0),
      valueClass: "text-emerald-400",
    })),
    ...(showInvestments
      ? investmentGroups.map((g) => ({
          key: `inv-${g.account}`,
          label: "Investment",
          name: g.account,
          value: fmt(g.value),
          valueClass: "text-indigo-300",
        }))
      : []),
    ...activeDebts.map((d) => ({
      key: `debt-${d.id}`,
      label: "Liability",
      name: d.name,
      value: `-${fmt(d.current_balance || 0)}`,
      valueClass: "text-rose-300",
    })),
  ].slice(0, 6);

  return (
    <div
      onClick={() => navigate("/accounts")}
      className="cursor-pointer rounded-lg bg-black border border-white/10 p-4 sm:p-5 hover:border-white/30 transition-colors duration-150"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 flex items-center justify-center bg-emerald-500/10 text-emerald-400 shrink-0">
            <Landmark className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-zinc-100">Accounts</h2>
            <p className="text-[11px] uppercase tracking-widest text-white/50 truncate">
              {itemCount > 0 ? `${itemCount} ${itemCount === 1 ? "item" : "items"}` : "Cash & investments"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-bold font-mono tabular-nums tracking-tight ${total < 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {fmt(total)}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleInvestments(); }}
            title="Toggle investment accounts"
            className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest border px-2.5 py-1.5 rounded-md transition-colors ${
              showInvestments
                ? "border-indigo-500/40 text-indigo-300 bg-indigo-500/10"
                : "border-white/10 text-white/50 hover:text-white"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
          </button>
          <ArrowRight className="h-4 w-4 text-white/30" />
        </div>
      </div>

      {previewCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {previewCards.map((card) => (
            <div key={card.key} className="rounded-lg border border-white/10 bg-black p-2.5">
              <span className="text-[10px] uppercase tracking-widest text-white/50 font-medium">{card.label}</span>
              <p className="text-sm font-semibold text-zinc-100 mt-1 truncate">{card.name}</p>
              <p className={`text-base font-bold font-mono tabular-nums tracking-tight ${card.valueClass}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 text-center py-4">
          {loading ? "Loading…" : "No accounts yet — click to manage"}
        </p>
      )}
    </div>
  );
}