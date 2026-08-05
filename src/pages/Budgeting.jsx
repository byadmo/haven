import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import BudgetChart from "@/components/finance/BudgetChart";
import BudgetAdvisor from "@/components/finance/BudgetAdvisor";
import GoalsTab from "@/components/dashboard/GoalsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Wallet, Receipt, TrendingUp, PiggyBank } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";

const STORE = "dd:budget-v1";
const TF_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
];
const ITEM_FREQS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
];
const QUICK_BILLS = ["Rent", "Food", "Insurance", "Car payment", "Credit card"];

function monthlyFactor(freq) {
  return freq === "weekly" ? 4.345 : freq === "biweekly" ? 2.1725 : 1;
}
function tfFactor(tf) {
  return tf === "daily" ? 1 / 30.4 : tf === "weekly" ? 1 / 4.345 : tf === "biweekly" ? 1 / 2.1725 : 1;
}
function toTF(amount, freq, tf) {
  return (Number(amount) || 0) * monthlyFactor(freq) * tfFactor(tf);
}
const uid = () => Math.random().toString(36).slice(2, 9);

const empty = {
  timeframe: "monthly",
  mode: "total",
  bills: [],
  incomeItems: [],
  totalIncome: { amount: "", frequency: "monthly" },
};

export default function Budgeting() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const { fmtMoney } = useCurrency();
  const fmt = (v) => fmtMoney(v);
  const [s, setS] = React.useState(() => {
    try { return { ...empty, ...JSON.parse(localStorage.getItem(STORE) || "{}") }; }
    catch { return empty; }
  });

  React.useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {}
  }, [s]);

  function set(p) { setS((prev) => ({ ...prev, ...p })); }

  // Bills
  function addBill(name = "") {
    set({ bills: [...s.bills, { id: uid(), name, amount: "", frequency: "monthly" }] });
  }
  function editBill(id, p) {
    set({ bills: s.bills.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  }
  function delBill(id) { set({ bills: s.bills.filter((b) => b.id !== id) }); }

  // Income items
  function addIncome() {
    set({ incomeItems: [...s.incomeItems, { id: uid(), name: "", amount: "", frequency: "monthly" }] });
  }
  function editIncome(id, p) {
    set({ incomeItems: s.incomeItems.map((it) => (it.id === id ? { ...it, ...p } : it)) });
  }
  function delIncome(id) { set({ incomeItems: s.incomeItems.filter((it) => it.id !== id) }); }

  const incomeMonthly =
    s.mode === "total"
      ? toTF(s.totalIncome.amount, s.totalIncome.frequency, "monthly")
      : s.incomeItems.reduce((sum, it) => sum + toTF(it.amount, it.frequency, "monthly"), 0);
  const spendingMonthly = s.bills.reduce((sum, b) => sum + toTF(b.amount, b.frequency, "monthly"), 0);

  const tf = s.timeframe;
  const tfLabel = TF_OPTIONS.find((o) => o.value === tf)?.label || tf;
  const incomeTF = incomeMonthly * tfFactor(tf);
  const spendingTF = spendingMonthly * tfFactor(tf);
  const leftoverTF = incomeTF - spendingTF;

  const billsTF = s.bills.map((b) => ({ name: b.name, amount: toTF(b.amount, b.frequency, tf) }));

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100">
      <DashboardHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <PageTitle icon={PiggyBank} title="Budgeting" subtitle="Plan a budget cycle and see what's left of every paycheque" />

        {/* Timeframe selector */}
        <div className="rounded-2xl border border-white/10 bg-black p-4">
          <Label className="text-[10px] uppercase tracking-widest text-white/50">Budget timeframe</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TF_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => set({ timeframe: o.value })}
                className={`px-3 h-9 rounded-md text-sm border transition-colors ${
                  tf === o.value
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-200"
                    : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/25"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recurring bills */}
          <div className="rounded-2xl border border-white/10 bg-black p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-zinc-100">Recurring bills</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_BILLS.map((q) => (
                <button
                  key={q}
                  onClick={() => addBill(q)}
                  className="text-[11px] px-2 py-1 rounded-md border border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/25"
                >
                  + {q}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => addBill()} className="w-full border-white/10 text-zinc-300">
              <Plus className="h-4 w-4" /> Add bill
            </Button>

            <div className="space-y-2">
              {s.bills.map((b) => (
                <div key={b.id} className="flex items-center gap-2">
                  <Input
                    value={b.name}
                    onChange={(e) => editBill(b.id, { name: e.target.value })}
                    placeholder="Bill name"
                    className="flex-1 bg-zinc-950 border-zinc-800 text-zinc-100"
                  />
                  <Input
                    type="number"
                    value={b.amount}
                    onChange={(e) => editBill(b.id, { amount: e.target.value })}
                    placeholder="0.00"
                    className="w-24 bg-zinc-950 border-zinc-800 text-zinc-100 tabular-nums"
                  />
                  <Select value={b.frequency} onValueChange={(v) => editBill(b.id, { frequency: v })}>
                    <SelectTrigger className="w-28 bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {ITEM_FREQS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => delBill(b.id)} className="h-9 w-9 flex items-center justify-center text-zinc-600 hover:text-rose-400 rounded-md">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {s.bills.length === 0 && <p className="text-xs text-zinc-600 text-center py-2">No bills added yet.</p>}
            </div>
          </div>

          {/* Income */}
          <div className="rounded-2xl border border-white/10 bg-black p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Income</h2>
              </div>
              <div className="flex text-[11px] rounded-md border border-white/10 overflow-hidden">
                <button
                  onClick={() => set({ mode: "total" })}
                  className={`px-2.5 py-1 ${s.mode === "total" ? "bg-emerald-500/15 text-emerald-200" : "text-zinc-500 hover:text-zinc-200"}`}
                >Total</button>
                <button
                  onClick={() => set({ mode: "itemized" })}
                  className={`px-2.5 py-1 ${s.mode === "itemized" ? "bg-emerald-500/15 text-emerald-200" : "text-zinc-500 hover:text-zinc-200"}`}
                >Itemized</button>
              </div>
            </div>

            {s.mode === "total" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={s.totalIncome.amount}
                  onChange={(e) => set({ totalIncome: { ...s.totalIncome, amount: e.target.value } })}
                  placeholder="Total income"
                  className="flex-1 bg-zinc-950 border-zinc-800 text-zinc-100 tabular-nums"
                />
                <Select
                  value={s.totalIncome.frequency}
                  onValueChange={(v) => set({ totalIncome: { ...s.totalIncome, frequency: v } })}
                >
                  <SelectTrigger className="w-28 bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {ITEM_FREQS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={addIncome} className="w-full border-white/10 text-zinc-300">
                  <Plus className="h-4 w-4" /> Add income source
                </Button>
                <div className="space-y-2">
                  {s.incomeItems.map((it) => (
                    <div key={it.id} className="flex items-center gap-2">
                      <Input
                        value={it.name}
                        onChange={(e) => editIncome(it.id, { name: e.target.value })}
                        placeholder="Source"
                        className="flex-1 bg-zinc-950 border-zinc-800 text-zinc-100"
                      />
                      <Input
                        type="number"
                        value={it.amount}
                        onChange={(e) => editIncome(it.id, { amount: e.target.value })}
                        placeholder="0.00"
                        className="w-24 bg-zinc-950 border-zinc-800 text-zinc-100 tabular-nums"
                      />
                      <Select value={it.frequency} onValueChange={(v) => editIncome(it.id, { frequency: v })}>
                        <SelectTrigger className="w-28 bg-zinc-950 border-zinc-800 text-zinc-100"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          {ITEM_FREQS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <button onClick={() => delIncome(it.id)} className="h-9 w-9 flex items-center justify-center text-zinc-600 hover:text-rose-400 rounded-md">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {s.incomeItems.length === 0 && <p className="text-xs text-zinc-600 text-center py-2">No income sources added yet.</p>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50"><Wallet className="h-3 w-3" /> Income</div>
            <p className="text-lg font-bold tabular-nums text-emerald-400 mt-1">{fmt(incomeTF)}</p>
            <p className="text-[10px] text-zinc-600">{tfLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50"><Receipt className="h-3 w-3" /> Spending</div>
            <p className="text-lg font-bold tabular-nums text-rose-400 mt-1">{fmt(spendingTF)}</p>
            <p className="text-[10px] text-zinc-600">{tfLabel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50"><PiggyBank className="h-3 w-3" /> Leftover</div>
            <p className={`text-lg font-bold tabular-nums mt-1 ${leftoverTF >= 0 ? "text-sky-400" : "text-rose-400"}`}>{fmt(leftoverTF)}</p>
            <p className="text-[10px] text-zinc-600">{tfLabel}</p>
          </div>
        </div>

        <BudgetChart bills={billsTF} incomeTotal={incomeTF} spendingTotal={spendingTF} leftover={leftoverTF} fmt={fmt} />

        <BudgetAdvisor
          timeframe={tf}
          timeframeLabel={tfLabel}
          bills={billsTF}
          incomeTotal={incomeTF}
          spendingTotal={spendingTF}
          leftover={leftoverTF}
          fmt={fmt}
        />

        <GoalsTab refreshKey={refreshKey} />
      </main>
    </div>
  );
}