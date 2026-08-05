import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { UploadCloud, ScanLine, Plus } from "lucide-react";
import BalanceFileCard from "@/components/finance/BalanceFileCard";

function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AccountBalanceImportModal({ open, onOpenChange, accounts = [], debts = [], onSaved }) {
  const [entries, setEntries] = React.useState([]);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) {
      // release any previews still held
      setEntries((prev) => {
        prev.forEach((e) => { if (e.preview) URL.revokeObjectURL(e.preview); });
        return [];
      });
    }
  }, [open]);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;
    const mapped = incoming.map((f) => ({
      id: newId(),
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    setEntries((e) => [...e, ...mapped]);
  }

  function removeEntry(id) {
    setEntries((e) => {
      const ent = e.find((x) => x.id === id);
      if (ent?.preview) URL.revokeObjectURL(ent.preview);
      return e.filter((x) => x.id !== id);
    });
  }

  function markDone(id) {
    setEntries((e) => e.map((x) => (x.id === id ? { ...x, _done: true } : x)));
  }

  const allDone = entries.length > 0 && entries.every((e) => e._done);

  React.useEffect(() => {
    if (open && allDone) onOpenChange?.(false);
  }, [open, allDone, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange?.(v); }}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-lg p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50 flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-emerald-400" /> Update Balances
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Upload one or more balance screenshots or PDFs — each file is read and updated separately.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-black hover:border-emerald-500/50 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-center touch-manipulation"
          >
            <UploadCloud className="h-7 w-7 text-zinc-500" />
            <div>
              <p className="text-sm text-zinc-300">Add screenshots or PDFs of your balances</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">Select multiple at once · PNG, JPG, or PDF</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />

          {entries.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-white/40">{entries.length} file{entries.length === 1 ? "" : "s"}</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="h-7 px-2.5 rounded-md border border-white/10 bg-black text-white/60 hover:text-white/90 hover:border-white/20 flex items-center gap-1 text-[11px] transition-colors"
              >
                <Plus className="h-3 w-3" /> Add more
              </button>
            </div>
          )}

          <div className="space-y-3">
            {entries.map((e) => (
              <BalanceFileCard
                key={e.id}
                entryId={e.id}
                file={e.file}
                initialPreview={e.preview}
                accounts={accounts}
                debts={debts}
                onSaved={onSaved}
                onRemove={removeEntry}
                onDone={() => markDone(e.id)}
              />
            ))}
            {entries.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-6">No files added yet.</p>
            )}
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
}