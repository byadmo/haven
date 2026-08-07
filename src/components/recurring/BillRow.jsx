// Single recurring-bill row: badges + meta + per-row actions (mark paid,
// pause/resume, edit, delete). AI-detected pending rows also render
// confirm/dismiss review buttons.
import React from "react";
import { Check, Pencil, Trash2, Pause, Play, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { dayDiff, freqLabel, catStyle } from "@/lib/recurringBills";

function acctName(accounts, id) {
  if (!id) return "";
  const a = (accounts || []).find((x) => x.id === id);
  return a ? ` · ${a.name}` : "";
}

export default function BillRow({ bill, accounts, onMarkPaid, onEdit, onDelete, onTogglePause, onReview }) {
  const dd = dayDiff(bill.next_due_date);
  const color = dd == null
    ? "text-white/40"
    : dd > 14 ? "text-emerald-300"
    : dd >= 7 ? "text-amber-300"
    : "text-rose-300";

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-2 rounded border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-medium text-zinc-100 truncate">{bill.name}</p>
          {bill.is_ai_detected && bill.ai_review_status === "pending" && (
            <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded border border-amber-400/40 bg-amber-500/15 text-amber-300 font-mono">
              <Sparkles className="h-2.5 w-2.5" /> AI
            </span>
          )}
          {bill.category && (
            <span className={`text-[9px] px-1 py-0.5 rounded border ${catStyle(bill.category)}`}>{bill.category}</span>
          )}
          {bill.is_auto_pay && (
            <span className="text-[9px] px-1 py-0.5 rounded border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">Auto</span>
          )}
          {!bill.is_active && (
            <span className="text-[9px] px-1 py-0.5 rounded border border-white/15 text-white/40">Paused</span>
          )}
        </div>
        <p className="text-[10px] text-white/40 font-mono tabular-nums mt-0.5 truncate">
          {freqLabel(bill.frequency)}
          {bill.frequency === "custom" && bill.custom_interval_days ? ` · every ${bill.custom_interval_days}d` : ""}
          {" · due "}{bill.next_due_date || "—"}
          {dd != null && ` · ${dd}d`}
          {acctName(accounts, bill.payment_account_id)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-xs font-mono tabular-nums ${color} mr-1`}>${(bill.amount || 0).toFixed(2)}</span>
        {bill.ai_review_status === "pending" && onReview && (
          <>
            <IconBtn title="Confirm" tone="emerald" onClick={() => onReview("confirmed")}><CheckCircle2 className="h-3.5 w-3.5" /></IconBtn>
            <IconBtn title="Dismiss" tone="rose" onClick={() => onReview("rejected")}><XCircle className="h-3.5 w-3.5" /></IconBtn>
          </>
        )}
        {bill.is_active && onMarkPaid && (
          <IconBtn title="Mark as paid" tone="emerald" onClick={onMarkPaid}><Check className="h-3.5 w-3.5" /></IconBtn>
        )}
        {onTogglePause && (
          <IconBtn title={bill.is_active ? "Pause" : "Resume"} onClick={onTogglePause}>
            {bill.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </IconBtn>
        )}
        {onEdit && <IconBtn title="Edit" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></IconBtn>}
        {onDelete && <IconBtn title="Delete" tone="rose" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></IconBtn>}
      </div>
    </div>
  );
}

function IconBtn({ title, tone = "neutral", onClick, children }) {
  const tones = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
    rose: "border-white/10 text-white/50 hover:text-rose-300 hover:border-rose-400/30 hover:bg-rose-500/10",
    neutral: "border-white/10 text-white/50 hover:text-white hover:border-white/30",
  };
  return (
    <button title={title} onClick={onClick} className={`h-6 w-6 grid place-items-center rounded border transition-colors ${tones[tone]}`}>
      {children}
    </button>
  );
}