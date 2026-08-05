import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EyeOff, Trash2 } from "lucide-react";

// Choice modal used when a user clicks the delete button on a recurring /
// upcoming row. Presents two options: hide from this list only (keeps the
// underlying transactions, so statistics are unaffected), or also delete the
// underlying transaction(s) (which will affect statistics).
export default function SuppressChoiceDialog({
  open,
  onOpenChange,
  title = "Remove this item",
  description,
  suppressLabel = "Remove from this list only",
  suppressDescription = "Hides it here. Your transactions and statistics stay the same.",
  deleteLabel = "Also remove from transaction history",
  deleteDescription = "Permanently deletes the underlying transaction(s). This affects your statistics.",
  busy = false,
  onSuppress,
  onDelete,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">{title}</DialogTitle>
          {description && <DialogDescription className="text-zinc-500">{description}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2 py-1">
          <button
            type="button"
            onClick={onSuppress}
            disabled={busy}
            className="w-full text-left rounded-lg border border-white/10 bg-black hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors p-3 disabled:opacity-50"
          >
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-md bg-indigo-500/15 flex items-center justify-center shrink-0">
                <EyeOff className="h-4 w-4 text-indigo-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">{suppressLabel}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{suppressDescription}</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="w-full text-left rounded-lg border border-white/10 bg-black hover:border-rose-500/40 hover:bg-rose-500/5 transition-colors p-3 disabled:opacity-50"
          >
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-md bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4 text-rose-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">{deleteLabel}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{deleteDescription}</p>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="border-white/10 text-zinc-400 hover:bg-white/5">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}