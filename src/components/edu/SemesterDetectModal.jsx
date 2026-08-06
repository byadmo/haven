import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TERMS = [
  { type: "fall", label: "Fall", start: [8, 1], end: [11, 31] },
  { type: "winter", label: "Winter", start: [0, 1], end: [3, 30] },
  { type: "spring_summer", label: "Spring/Summer", start: [4, 1], end: [7, 31] },
];

function rangeFor(type, year) {
  const t = TERMS.find((x) => x.type === type);
  const s = new Date(year, t.start[0], t.start[1]);
  const e = new Date(year, t.end[0], t.end[1]);
  return { start_date: s.toISOString().slice(0, 10), end_date: e.toISOString().slice(0, 10) };
}

export default function SemesterDetectModal({ open, detected, onConfirm, onClose }) {
  const [selected, setSelected] = React.useState(detected?.term_type || "fall");
  React.useEffect(() => { if (open) setSelected(detected?.term_type || "fall"); }, [open, detected]);

  const year = detected?.year || new Date().getFullYear();
  const r = rangeFor(selected, year);
  const label = `${TERMS.find((t) => t.type === selected).label} ${year}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Detected term</DialogTitle>
          <DialogDescription className="text-white/50">Confirm your active semester or switch terms.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-lg font-semibold text-emerald-300">{label}</p>
            <p className="text-xs text-white/50 mt-1 font-mono tabular-nums">{r.start_date} → {r.end_date}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Switch term</p>
            <div className="grid grid-cols-3 gap-2">
              {TERMS.map((t) => (
                <button
                  key={t.type}
                  onClick={() => setSelected(t.type)}
                  className={`rounded-md border px-2 py-2 text-xs transition-colors ${
                    selected === t.type ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button onClick={() => onClose?.()} variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Cancel</Button>
          <Button
            onClick={() => onConfirm({ term_type: selected, term_label: label, year, ...r })}
            className="bg-emerald-500 text-black hover:bg-emerald-400"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}