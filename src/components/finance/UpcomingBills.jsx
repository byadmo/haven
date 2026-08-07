import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, Receipt, Ban, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { filterGenuineBills } from "@/lib/billFilters";

function dayDiff(dateStr) {
  const d = new Date((dateStr || "") + "T00:00:00");
  if (isNaN(d)) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function addInterval(dateStr, freq, interval, unit) {
  const d = new Date((dateStr || "") + "T00:00:00");
  if (isNaN(d)) return dateStr;
  switch (freq) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    case "custom": {
      const n = interval || 1;
      if (unit === "days") d.setDate(d.getDate() + n);
      else if (unit === "weeks") d.setDate(d.getDate() + 7 * n);
      else if (unit === "months") d.setMonth(d.getMonth() + n);
      else if (unit === "years") d.setFullYear(d.getFullYear() + n);
      break;
    }
    default: return dateStr;
  }
  return d.toISOString().slice(0, 10);
}

export default function UpcomingBills({ transactions, onChanged }) {
  const { toast } = useToast();
  const [paying, setPaying] = useState(null);
  const [stopping, setStopping] = useState(null);

  const bills = useMemo(() => {
    return filterGenuineBills(transactions)
      .filter((t) => dayDiff(t.next_date) != null)
      .filter((t) => {
        const dd = dayDiff(t.next_date);
        return dd >= 0 && dd <= 14;
      })
      .sort((a, b) => (a.next_date || "").localeCompare(b.next_date || ""));
  }, [transactions]);

  async function markPaid(t) {
    setPaying(t.id);
    try {
      if (t.frequency === "one_time") {
        await base44.entities.Transaction.update(t.id, { is_scheduled: false, next_date: null });
      } else {
        const next = addInterval(t.next_date, t.frequency, t.custom_interval, t.custom_unit);
        await base44.entities.Transaction.update(t.id, { next_date: next });
      }
      toast({ title: "Bill marked paid", description: t.description });
      onChanged?.();
    } catch (e) {
      toast({ title: "Couldn't update bill", variant: "destructive" });
    } finally {
      setPaying(null);
    }
  }

  async function stopBill(t) {
    setStopping(t.id);
    try {
      await base44.entities.Transaction.update(t.id, { recurring_suppressed: true, is_scheduled: false, next_date: null });
      toast({ title: "Payment stopped", description: `${t.description} will no longer appear in Upcoming.` });
      onChanged?.();
    } catch (e) {
      toast({ title: "Couldn't stop payment", variant: "destructive" });
    } finally {
      setStopping(null);
    }
  }

  const dueSoon = bills.filter((b) => dayDiff(b.next_date) < 3).length;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-300" />
          <p className="text-[10px] uppercase tracking-widest text-white/50">Upcoming Bills</p>
        </div>
        <div className="flex items-center gap-2">
          {dueSoon > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-rose-400/40 bg-rose-500/15 text-rose-300 font-mono tabular-nums">
              <Bell className="h-3 w-3" /> {dueSoon} due
            </span>
          )}
          <Link to="/recurring-bills" className="inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-emerald-300 hover:text-emerald-200 transition-colors">
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
      {bills.length ? (
        <div className="space-y-1.5">
          {bills.map((b) => {
            const dd = dayDiff(b.next_date);
            const color = dd > 7 ? "text-emerald-300" : dd >= 3 ? "text-amber-300" : "text-rose-300";
            const border = dd > 7 ? "border-white/10" : dd >= 3 ? "border-amber-400/20" : "border-rose-400/30 bg-rose-500/5";
            return (
              <div key={b.id} className={`flex items-center justify-between gap-2 py-1.5 px-2 rounded border ${border}`}>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-100 truncate">{b.description}</p>
                  <p className="text-[10px] text-white/40 font-mono tabular-nums">due {b.next_date} · {dd}d left</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-mono tabular-nums ${color}`}>{(b.amount || 0).toFixed(2)}</span>
                  <button
                    onClick={() => markPaid(b)}
                    disabled={paying === b.id}
                    title="Mark as paid"
                    className="h-6 w-6 grid place-items-center rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => stopBill(b)}
                    disabled={stopping === b.id}
                    title="Stop this payment from appearing"
                    className="h-6 w-6 grid place-items-center rounded border border-white/10 text-white/50 hover:text-rose-300 hover:border-rose-400/30 hover:bg-rose-500/10 disabled:opacity-40 transition-colors"
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/30 text-center py-6">No bills due in the next 14 days.</p>
      )}
    </div>
  );
}