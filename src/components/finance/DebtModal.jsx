import React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import DebtForm from "@/components/finance/DebtForm";

export default function DebtModal({ open, onOpenChange, onSaved }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Add Liability</DialogTitle>
          <DialogDescription className="text-zinc-500">Add a debt to your ledger — Tab to move, Enter to save.</DialogDescription>
        </DialogHeader>
        <div className="px-5 pb-5">
          <DebtForm onSaved={() => { onOpenChange?.(false); onSaved?.(); }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}