// Paycheque Splitter — the main visual. A donut chart of the per-paycheque
// split across vaults, each with a live-editable allocation (input for
// Savings, slider for Variable Needs, locked for Fixed Bills, auto for
// Unallocated). Edits debounce-save to AllocationVault after 1s.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { computeAllocation, money, pct, ALLOCATION_TYPE_LABELS } from "@/lib/paychequeAllocator";

export default function PaychequeSplitter({ bills, vaults, setVaults, profile, reloadVaults, onAddVault, billsRequirement }) {
  const baseIncome = Number(profile?.base_income) || 0;
  const [payAmount, setPayAmount] = useState(baseIncome || 0);

  // Keep the "Enter Paycheque Amount" field in sync when the profile changes.
  useEffect(() => { setPayAmount(baseIncome || 0); }, [baseIncome]);

  const { items, committed, cushion } = useMemo(
    () => computeAllocation({ income: payAmount, vaults, perPaychequeBills: billsRequirement }),
    [payAmount, vaults, billsRequirement]
  );

  const over = cushion < 0;

  // Chart segments — clipped to >=0 for the pie; overflow adds a red slice.
  const chartData = items.map((v) => ({
    name: v.vault_name,
    value: Math.max(0, v.amount),
    color: v.color,
    type: v.allocation_type,
  }));
  if (over) chartData.push({ name: "Over-allocated", value: Math.abs(cushion), color: "#ef4444", type: "overflow" });

  // Debounced (1s) persistence of allocation edits.
  const saveTimers = useRef({});
  function persistAllocation(v, value) {
    if (saveTimers.current[v.id]) clearTimeout(saveTimers.current[v.id]);
    saveTimers.current[v.id] = setTimeout(async () => {
      try { await base44.entities.AllocationVault.update(v.id, { target_allocation: value }); }
      catch { reloadVaults(); }
    }, 1000);
  }
  useEffect(() => () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
  }, []);

  // Local editable map so edits feel instant while pending the debounced save.
  function setLocalAmount(v, value) {
    setVaults((prev) => prev.map((x) => (x.id === v.id ? { ...x, target_allocation: value } : x)));
    if (v.allocation_type !== "Fixed Bill" && v.allocation_type !== "Unallocated") persistAllocation(v, value);
  }

  async function deleteVault(v) {
    try {
      await base44.entities.AllocationVault.delete(v.id);
      reloadVaults();
    } catch {}
  }

  return (
    <section className="rounded-lg border border-white/10 bg-black p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <p className="text-sm font-semibold text-zinc-100">Paycheque Splitter</p>
        <Button size="sm" variant="outline" onClick={onAddVault} className="border-white/10 text-white/70 hover:text-white hover:border-white/30">
          <Plus className="h-4 w-4 mr-1" /> Add Vault
        </Button>
      </div>

      {/* Paycheque amount input */}
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1 max-w-xs">
          <label className="text-[11px] text-white/50 mb-1 block">Enter Paycheque Amount</label>
          <Input
            type="number"
            step="0.01"
            value={payAmount || ""}
            onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
            className="font-mono tabular-nums text-lg"
          />
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Splitting</p>
          <p className="text-base font-mono tabular-nums text-emerald-300">{money(payAmount)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        {/* Donut chart */}
        <div className="h-52 sm:h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius="58%"
                outerRadius="92%"
                paddingAngle={1.5}
                stroke="none"
              >
                {chartData.map((d, i) => {
                  const isCushion = d.type === "Unallocated";
                  const isOverflow = d.type === "overflow";
                  return (
                    <Cell
                      key={i}
                      fill={d.color}
                      fillOpacity={isCushion ? 0.3 : isOverflow ? 0.85 : 1}
                      stroke={isCushion ? d.color : "none"}
                      strokeDasharray={isCushion ? "4 4" : undefined}
                      strokeWidth={isCushion ? 2 : 0}
                    />
                  );
                })}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Vault allocations list */}
        <div className="space-y-2">
          {items.map((v) => (
            <VaultAllocationRow
              key={v.id}
              v={v}
              income={payAmount}
              othersCommitted={committed - (v.allocation_type === "Unallocated" ? 0 : (Number(v.target_allocation) || 0))}
              isOver={over}
              onAmount={(val) => setLocalAmount(v, val)}
              onDelete={() => deleteVault(v)}
            />
          ))}
          {/* Total bar */}
          <div className="mt-1 pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-white/50">Total allocated</span>
            <span className={`text-sm font-mono tabular-nums ${over ? "text-rose-300" : "text-zinc-100"}`}>{money(committed + Math.max(0, cushion))}</span>
          </div>
        </div>
      </div>

      {/* Cushion / over-allocation banner */}
      {over ? (
        <div className="mt-3 rounded border border-rose-400/30 bg-rose-500/5 p-2.5">
          <p className="text-xs text-rose-300">Over-allocated by {money(Math.abs(cushion))} — reduce vault targets.</p>
        </div>
      ) : (
        <div className="mt-3 rounded border border-emerald-400/20 bg-emerald-500/5 p-2.5 flex items-center justify-between">
          <span className="text-xs text-emerald-300/80">Discretionary Cushion</span>
          <span className="text-sm font-mono tabular-nums text-emerald-300">{money(cushion)}</span>
        </div>
      )}
    </section>
  );
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded border border-white/15 bg-black px-2 py-1 text-[10px] text-zinc-100">
      <span style={{ color: d.color }}>● </span>{d.name}: {money(d.value)}
    </div>
  );
}

function VaultAllocationRow({ v, income, othersCommitted, isOver, onAmount, onDelete }) {
  const isFixed = v.allocation_type === "Fixed Bill";
  const isUnalloc = v.allocation_type === "Unallocated";
  const isVariable = v.allocation_type === "Variable Need";
  const value = isFixed || isUnalloc ? v.amount : (Number(v.target_allocation) || 0);
  const share = pct(Math.max(0, v.amount), income);

  const sliderMax = Math.max(10, income - othersCommitted);

  return (
    <div className="rounded border border-white/10 bg-white/[0.02] p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-100 truncate">{v.vault_name}</p>
            <p className="text-[10px] text-white/40">{ALLOCATION_TYPE_LABELS[v.allocation_type]} · bal {money(v.current_balance)} · {share}%</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isFixed ? (
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-zinc-100">
              <Lock className="h-3 w-3 text-white/40" />{money(v.amount)}
            </div>
          ) : isUnalloc ? (
            <span className={`text-xs font-mono tabular-nums ${isOver ? "text-rose-300" : "text-emerald-300"}`}>{money(v.amount)}</span>
          ) : (
            <Input
              type="number"
              step="0.01"
              value={value || ""}
              onChange={(e) => onAmount(Number(e.target.value) || 0)}
              className="h-7 w-20 font-mono tabular-nums text-right"
            />
          )}
          <button onClick={onDelete} title="Delete vault" className="h-6 w-6 grid place-items-center rounded border border-white/10 text-white/40 hover:text-rose-300 hover:border-rose-400/30">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isVariable && (
        <div className="mt-2 px-1">
          <Slider
            value={[Math.min(value, sliderMax)]}
            min={0}
            max={sliderMax}
            step={10}
            onValueChange={(arr) => onAmount(arr[0])}
          />
          <div className="flex justify-between text-[10px] text-white/30 mt-0.5 font-mono tabular-nums">
            <span>$0</span>
            <span>${Math.round(sliderMax)}</span>
          </div>
        </div>
      )}
    </div>
  );
}