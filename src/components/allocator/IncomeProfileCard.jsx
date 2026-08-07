// Income Profile Setup card — collects the user's per-paycheque base income,
// pay frequency, and pay day. Saves instantly to UserFinancialProfile via the
// shared `updateProfile` context helper, and surfaces the derived annual income.
import React, { useEffect, useRef } from "react";
import { Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INCOME_FREQ_OPTIONS, annualIncome, money } from "@/lib/paychequeAllocator";

export default function IncomeProfileCard({ profile, updateProfile }) {
  const baseIncome = profile?.base_income ?? 0;
  const frequency = profile?.income_frequency || "Bi-Weekly";
  const payDay = profile?.pay_day ?? "";

  // Debounced auto-save for the dollar amount (avoid a write per keystroke).
  const debounceRef = useRef(null);
  function saveBaseIncome(value) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateProfile({ base_income: Number(value) || 0 });
    }, 600);
  }

  // Clear the pending debounce save if the card unmounts mid-edit.
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const annual = annualIncome(baseIncome, frequency);
  const dayHint = frequency === "Monthly" ? "Day of month (1–31)" : "Day of week (1=Mon … 7=Sun)";

  return (
    <section className="rounded-lg border border-white/10 bg-black p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 grid place-items-center rounded-lg border border-emerald-400/30 bg-emerald-500/10">
          <Wallet className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Income Profile</p>
          <p className="text-[11px] text-white/50">Your paycheque details — drives the split below.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px] text-white/50 mb-1 block">Base income (per pay)</Label>
          <Input
            type="number"
            step="0.01"
            defaultValue={baseIncome || ""}
            key={baseIncome}
            onChange={(e) => saveBaseIncome(e.target.value)}
            placeholder="0.00"
            className="font-mono tabular-nums"
          />
        </div>
        <div>
          <Label className="text-[11px] text-white/50 mb-1 block">Pay frequency</Label>
          <Select value={frequency} onValueChange={(v) => updateProfile({ income_frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INCOME_FREQ_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-white/50 mb-1 block">Pay day</Label>
          <Input
            type="number"
            min={1}
            max={frequency === "Monthly" ? 31 : 7}
            defaultValue={payDay ?? ""}
            key={`${frequency}-${payDay}`}
            onBlur={(e) => updateProfile({ pay_day: Number(e.target.value) || null })}
            placeholder={frequency === "Monthly" ? "e.g. 15" : "e.g. 5 (Fri)"}
            className="font-mono tabular-nums"
          />
          <p className="text-[10px] text-white/30 mt-1">{dayHint}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/10 flex items-baseline justify-between">
        <span className="text-[11px] text-white/50">Annual income</span>
        <span className="text-lg font-mono tabular-nums text-emerald-300">{money(annual)}</span>
      </div>
    </section>
  );
}