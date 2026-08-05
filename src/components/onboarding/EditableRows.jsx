import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";

// Generic editable list: each step supplies makeBlank() and renderRow(item, update).
export default function EditableRows({
  items,
  makeBlank,
  renderRow,
  onChange,
  addLabel = "Add manually",
  emptyHint = "No items yet — upload a statement or add one manually.",
}) {
  const update = (i, patch) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, makeBlank()]);

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-white/40 italic px-1 py-2">{emptyHint}</p>
      )}
      <AnimatePresence mode="popLayout">
        {items.map((it, i) => (
          <motion.div
            key={i}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="rounded-md border border-white/10 bg-black/60 p-3"
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">{renderRow(it, (patch) => update(i, patch))}</div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="mt-1 h-7 w-7 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors shrink-0"
                aria-label="Remove row"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={add}
        className="w-full rounded-md border border-dashed border-white/15 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-white/50 hover:text-emerald-300 text-xs px-3 py-2 transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
    </div>
  );
}