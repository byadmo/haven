import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TERMS = [
  { type: "fall", label: "Fall", m0: 8, d0: 1, m1: 11, d1: 31 },
  { type: "winter", label: "Winter", m0: 0, d0: 1, m1: 3, d1: 30 },
  { type: "spring_summer", label: "Spring/Summer", m0: 4, d0: 1, m1: 7, d1: 31 },
];

// Year follows the TERM, not the current calendar year.
// For a given term type, find the soonest occurrence whose end date is still
// in the future (i.e. not yet ended). Aug 6 2026 -> Spring/Summer 2026;
// switching to Winter -> Winter 2027 (since Winter 2026 already ended).
function upcoming(type, now = new Date()) {
  const t = TERMS.find((x) => x.type === type);
  const mk = (y) => {
    const start = new Date(y, t.m0, t.d0);
    const end = new Date(y, t.m1, t.d1);
    return {
      term_type: type,
      term_label: `${t.label} ${y}`,
      year: y,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    };
  };
  let y = now.getFullYear();
  // If this term already ended this year, use next year's occurrence.
  const thisYear = mk(y);
  if (new Date(thisYear.end_date) < now) y++;
  return mk(y);
}

export function upcomingTerms(now = new Date()) {
  return TERMS.map((t) => upcoming(t.type, now));
}

export default function SemesterDetectModal({ open, detected, onConfirm, onClose }) {
  const [selected, setSelected] = React.useState(detected?.term_type || "fall");
  React.useEffect(() => { if (open) setSelected(detected?.term_type || "fall"); }, [open, detected]);

  const options = React.useMemo(() => upcomingTerms(), [open]);
  const current = options.find((o) => o.term_type === selected) || options[0];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Detected term</DialogTitle>
          <DialogDescription className="text-white/50">Confirm your active semester or switch terms.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-lg font-semibold text-emerald-300">{current.term_label}</p>
            <p className="text-xs text-white/50 mt-1 font-mono tabular-nums">{current.start_date} → {current.end_date}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Switch term</p>
            <div className="grid grid-cols-3 gap-2">
              {options.map((o) => (
                <button
                  key={o.term_type}
                  onClick={() => setSelected(o.term_type)}
                  className={`rounded-md border px-2 py-2 text-xs transition-colors ${
                    selected === o.term_type ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  {o.term_label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button onClick={() => onClose?.()} variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Cancel</Button>
          <Button
            onClick={() => onConfirm({ ...current, is_active: true })}
            className="bg-emerald-500 text-black hover:bg-emerald-400"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}