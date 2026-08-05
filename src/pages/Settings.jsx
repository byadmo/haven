import React from "react";
import DashboardHeader from "@/components/finance/DashboardHeader";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import { useCategories } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, RotateCcw, ChevronLeft, ShieldCheck, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MonthlyReport from "@/components/finance/MonthlyReport";
import UiSizeSetting from "@/components/finance/UiSizeSetting";
import AutomatedReportSettings from "@/components/finance/AutomatedReportSettings";
import CalendarSyncSettings from "@/components/finance/CalendarSyncSettings";
import CurrencySettings from "@/components/finance/CurrencySettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

export default function Settings() {
  const { categories, loading, add, remove, restoreDefaults } = useCategories();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleteText, setDeleteText] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await Promise.all([
        base44.entities.Transaction.deleteMany({}).catch(() => {}),
        base44.entities.Debt.deleteMany({}).catch(() => {}),
        base44.entities.Account.deleteMany({}).catch(() => {}),
        base44.entities.Stock.deleteMany({}).catch(() => {}),
        base44.entities.Category.deleteMany({}).catch(() => {}),
        base44.entities.DebtPayment.deleteMany({}).catch(() => {}),
      ]);
      try {
        await base44.entities.User.delete(user.id);
      } catch (e) {
        // Platform may block self-deletion; data is cleaned regardless
      }
    } finally {
      setDeleting(false);
      base44.auth.logout(window.location.origin);
    }
  }

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

      <div className="sm:hidden px-5 pt-4">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to Overview
        </button>
      </div>

      <main className="relative max-w-3xl mx-auto px-5 sm:px-6 py-8 sm:py-6 space-y-8 sm:space-y-6">
        <Reveal><PageTitle title="Settings" subtitle="Categories, currency, reports, and account controls" /></Reveal>

        <Reveal>
          <button
            onClick={() => navigate("/setup")}
            className="w-full text-left rounded-lg border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors p-5 group"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold font-mono tracking-tight text-zinc-100">Complete Your Profile</p>
                <p className="text-xs text-white/40 mt-0.5">Re-run the guided setup wizard to import statements and rebuild your accounts, bills, debts, and investments.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </button>
        </Reveal>

        <Reveal><UiSizeSetting /></Reveal>

        <div>
          <h2 className="text-xs uppercase tracking-widest text-white/50">Categories</h2>
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

        <Reveal delay={0.03}>
          <CurrencySettings />
        </Reveal>

        <Reveal delay={0.04}>
          <AutomatedReportSettings />
        </Reveal>

        <Reveal delay={0.05}>
          <MonthlyReport />
        </Reveal>

        <Reveal delay={0.07}>
          <CalendarSyncSettings />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-5">
            <h2 className="text-xs uppercase tracking-widest text-rose-400/80">Danger Zone</h2>
            <p className="text-lg font-semibold font-mono tracking-tight text-zinc-100 mt-1">Delete Account</p>
            <p className="text-xs text-white/40 mt-1 mb-4">Permanently delete your account and all associated financial data. This action cannot be undone.</p>
            <Button
              variant="outline"
              onClick={() => setShowDelete(true)}
              className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete My Account
            </Button>
          </div>
        </Reveal>
      </main>

      <Dialog open={showDelete} onOpenChange={(v) => { setShowDelete(v); if (!v) setDeleteText(""); }}>
        <DialogContent className="bg-zinc-900 border-rose-500/30 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Delete Account</DialogTitle>
            <DialogDescription className="text-zinc-500">
              This will permanently delete all your transactions, debts, accounts, and portfolio data. Type <span className="text-rose-400 font-mono">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="bg-zinc-950 border-zinc-800 text-zinc-100"
            autoFocus
          />
          <DialogFooter className="pt-2 gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="border-white/10 text-zinc-400 hover:bg-white/5">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              disabled={deleting || deleteText !== "DELETE"}
              onClick={handleDeleteAccount}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {deleting ? "Deleting…" : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}