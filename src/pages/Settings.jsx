import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import Reveal from "@/components/finance/Reveal";
import { useCategories } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
  const { categories, loading, add, remove, restoreDefaults } = useCategories();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function onAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await add(name);
      setName("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30">
      <DashboardHeader />

      <main className="relative max-w-3xl mx-auto px-6 sm:px-6 py-10 sm:py-6 space-y-10 sm:space-y-6">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-white/50">Settings</h2>
          <p className="text-lg font-semibold font-mono tracking-tight text-zinc-100 mt-1">Transaction Categories</p>
          <p className="text-xs text-white/40 mt-1">Add or remove the categories available when creating and editing transactions.</p>
        </div>

        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <form onSubmit={onAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New category name"
                className="bg-zinc-950 border-white/10 text-zinc-100 flex-1 h-10"
              />
              <Button type="submit" disabled={saving || !name.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </form>

            <div className="space-y-1.5">
              <AnimatePresence mode="popLayout">
                {categories.length === 0 && !loading && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-white/40 text-center py-6"
                  >
                    No categories yet. Add one above or restore the defaults.
                  </motion.p>
                )}
                {categories.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="group flex items-center justify-between rounded-md border border-white/10 bg-black px-3 py-2 hover:border-white/30 transition-colors"
                  >
                    <span className="text-sm text-zinc-200 truncate">{c.name}</span>
                    <button
                      onClick={() => remove(c.id)}
                      className="h-7 w-7 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                      aria-label={`Remove ${c.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {categories.length === 0 && (
              <Button
                variant="outline"
                onClick={restoreDefaults}
                className="mt-4 border-white/10 text-zinc-300 hover:bg-white/5"
              >
                <RotateCcw className="h-4 w-4 mr-1" /> Restore defaults
              </Button>
            )}
          </div>
        </Reveal>
      </main>
    </div>
  );
}