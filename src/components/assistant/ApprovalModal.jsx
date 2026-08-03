import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Check, RefreshCw, Pencil } from "lucide-react";

const ACTION_TONE = {
  create: "text-emerald-400 border-emerald-500/40",
  update: "text-amber-400 border-amber-500/40",
  delete: "text-rose-400 border-rose-500/40",
};

export default function ApprovalModal({ open, operations, busy, onApprove, onRegenerate, onClose }) {
  const [selected, setSelected] = React.useState(() => (operations || []).map(() => true));
  const [feedback, setFeedback] = React.useState("");
  const [showFeedback, setShowFeedback] = React.useState(false);

  React.useEffect(() => {
    setSelected((operations || []).map(() => true));
  }, [operations]);

  const list = operations || [];
  const count = selected.filter(Boolean).length;
  const toggle = (i) => setSelected((s) => s.map((v, j) => (j === i ? !v : v)));

  function approveAll() { onApprove(list); }
  function approveSelected() { onApprove(list.filter((_, i) => selected[i])); }
  function regenerate() { onRegenerate(list, feedback); setFeedback(""); setShowFeedback(false); }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-lg p-0 max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-4">
          <div>
            <DialogTitle className="text-sm font-mono uppercase tracking-widest">Approve Changes</DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-widest text-white/40">
              {list.length} proposed change{list.length === 1 ? "" : "s"} · review before applying
            </DialogDescription>
          </div>

          <div className="space-y-2">
            {list.map((op, i) => (
              <div key={op.id || i} className="flex items-start gap-3 p-3 border border-white/10 rounded-sm">
                <Checkbox checked={selected[i]} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-mono uppercase ${ACTION_TONE[op.action] || ""}`}>
                      {op.action}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 border border-white/15 rounded-sm font-mono uppercase text-white/60">
                      {op.entity}
                    </span>
                    {op.targetId && (
                      <span className="text-[9px] font-mono text-white/30">→ {op.targetId.slice(-6)}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-100">{op.summary || "Untitled change"}</p>
                  {op.data && Object.keys(op.data).length > 0 && (
                    <pre className="mt-1 text-[10px] font-mono text-white/40 whitespace-pre-wrap break-words">
                      {JSON.stringify(op.data, null, 0)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={approveAll} disabled={busy} className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400 font-mono uppercase tracking-widest text-xs h-10">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Approve All
            </Button>
            <Button onClick={approveSelected} disabled={busy || count === 0} variant="outline"
              className="flex-1 border-white/15 text-white/70 hover:text-white hover:border-white/30 font-mono uppercase tracking-widest text-xs h-10">
              Approve ({count})
            </Button>
          </div>

          {!showFeedback ? (
            <button onClick={() => setShowFeedback(true)}
              className="text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white/70 flex items-center gap-1">
              <Pencil className="h-3 w-3" /> Request changes
            </button>
          ) : (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/50">Tell the AI what to change</p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="e.g. skip the coffee one, and change rent to $2000"
                className="w-full bg-black border border-white/10 rounded-sm p-2 text-sm text-zinc-100 focus:outline-none focus:border-white/30"
              />
              <div className="flex gap-2">
                <Button onClick={regenerate} disabled={busy || !feedback.trim()}
                  className="bg-indigo-600 text-white hover:bg-indigo-500 font-mono uppercase tracking-widest text-xs h-9">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  Regenerate
                </Button>
                <Button onClick={() => { setShowFeedback(false); setFeedback(""); }} variant="ghost" className="text-white/50">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}