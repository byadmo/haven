import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Tags, Plus, X, DollarSign, Briefcase, TrendingUp, Filter } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { useCurrency } from "@/lib/currency-context";

const staggerVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: "easeOut" },
  }),
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const TAG_COLORS = [
  { name: "emerald", bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  { name: "blue", bg: "bg-blue-500/10", text: "text-blue-300", border: "border-blue-500/30" },
  { name: "purple", bg: "bg-purple-500/10", text: "text-purple-300", border: "border-purple-500/30" },
  { name: "amber", bg: "bg-amber-500/10", text: "text-amber-300", border: "border-amber-500/30" },
  { name: "rose", bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/30" },
  { name: "cyan", bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/30" },
  { name: "indigo", bg: "bg-indigo-500/10", text: "text-indigo-300", border: "border-indigo-500/30" },
  { name: "lime", bg: "bg-lime-500/10", text: "text-lime-300", border: "border-lime-500/30" },
];

const SUGGESTED_TAGS = ["Freelance", "Contract", "Full-Time", "Side Project", "Investment", "Rental", "Dividend", "Crypto", "Gig", "Royalty"];

export default function IncomeTagManager() {
  const { transactions, refresh } = useFinanceData();
  const { fmtMoney: fmt } = useCurrency();
  const [newTag, setNewTag] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [editingTxn, setEditingTxn] = useState(null);

  // Collect unique project tags from income transactions
  const { tags, taggedIncome, untaggedIncome } = useMemo(() => {
    const incomeTxns = transactions.filter((t) => t.amount > 0);
    const tagSet = new Set();
    const tagged = [];
    const untagged = [];

    incomeTxns.forEach((t) => {
      const tTags = t.project_tags || t.income_tags || [];
      if (Array.isArray(tTags) && tTags.length > 0) {
        tTags.forEach((tag) => tagSet.add(tag));
        tagged.push(t);
      } else {
        untagged.push(t);
      }
    });

    return {
      tags: [...tagSet].sort(),
      taggedIncome: tagged,
      untaggedIncome: untagged,
    };
  }, [transactions]);

  // Per-tag totals
  const tagTotals = useMemo(() => {
    const totals = {};
    taggedIncome.forEach((t) => {
      const tTags = t.project_tags || t.income_tags || [];
      tTags.forEach((tag) => {
        totals[tag] = (totals[tag] || 0) + (t.amount || 0);
      });
    });
    return totals;
  }, [taggedIncome]);

  // Monthly breakdown per tag
  const tagMonthly = useMemo(() => {
    const monthly = {};
    const now = new Date();
    taggedIncome.forEach((t) => {
      const tTags = t.project_tags || t.income_tags || [];
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      tTags.forEach((tag) => {
        monthly[tag] = monthly[tag] || {};
        monthly[tag][key] = (monthly[tag][key] || 0) + (t.amount || 0);
      });
    });
    return monthly;
  }, [taggedIncome]);

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag)) return;
    setNewTag("");
    // Tag is stored per-transaction; we'll apply to untagged income
    if (untaggedIncome.length === 0) return;
    // Apply to first 10 untagged transactions
    const batch = untaggedIncome.slice(0, 10);
    try {
      await Promise.all(batch.map((t) =>
        base44.entities.Transaction.update(t.id, {
          project_tags: [...(t.project_tags || []), tag],
          income_tags: [...(t.income_tags || []), tag],
        })
      ));
      refresh();
    } catch (e) {
      console.error("Failed to tag transactions:", e);
    }
  };

  const handleRemoveTag = async (tag) => {
    const batch = taggedIncome.filter((t) => {
      const tTags = t.project_tags || t.income_tags || [];
      return tTags.includes(tag);
    }).slice(0, 10);

    try {
      await Promise.all(batch.map((t) => {
        const updated = (t.project_tags || []).filter((tg) => tg !== tag);
        return base44.entities.Transaction.update(t.id, {
          project_tags: updated,
          income_tags: updated,
        });
      }));
      refresh();
    } catch (e) {
      console.error("Failed to remove tag:", e);
    }
  };

  const handleQuickTag = async (tag, txn) => {
    try {
      await base44.entities.Transaction.update(txn.id, {
        project_tags: [...(txn.project_tags || []), tag],
        income_tags: [...(txn.income_tags || []), tag],
      });
      refresh();
    } catch (e) {
      console.error("Failed to tag transaction:", e);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header */}
      <motion.div variants={staggerVariants} custom={0} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Income by Project</h3>
        </div>
        <span className="text-[10px] text-white/40">{tags.length} tags · {fmt(Object.values(tagTotals).reduce((a, b) => a + b, 0))} total</span>
      </motion.div>

      {/* Tag chips */}
      <motion.div variants={staggerVariants} custom={1} className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => {
          const color = TAG_COLORS[i % TAG_COLORS.length];
          const total = tagTotals[tag] || 0;
          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-all hover:scale-105 active:scale-95 ${
                selectedTag === tag
                  ? `${color.bg} ${color.border} ${color.text}`
                  : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              <DollarSign className="h-3 w-3" />
              {tag}
              <span className="font-mono text-[9px] opacity-60">{fmt(total)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                className="h-3.5 w-3.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </button>
          );
        })}

        {/* Add tag input */}
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-white/10">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="New tag..."
            className="w-20 bg-transparent text-xs text-white placeholder-white/30 outline-none"
          />
          <button onClick={handleAddTag} className="text-white/40 hover:text-white transition-colors">
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {tags.length === 0 && !newTag && SUGGESTED_TAGS.slice(0, 5).map((s) => (
          <button
            key={s}
            onClick={() => { setNewTag(s); }}
            className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-1.5 py-0.5"
          >
            +{s}
          </button>
        ))}
      </motion.div>

      {/* Selected tag breakdown */}
      {selectedTag && tagMonthly[selectedTag] && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
        >
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 font-mono">Monthly trend · {selectedTag}</p>
          <div className="space-y-1">
            {Object.entries(tagMonthly[selectedTag])
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 12)
              .map(([month, amt]) => (
                <div key={month} className="flex items-center gap-3 text-xs">
                  <span className="text-white/40 w-16 font-mono">{month}</span>
                  <div className="flex-1 h-4 rounded bg-white/5 overflow-hidden">
                    <div className="h-full rounded bg-emerald-500/40 transition-all" style={{ width: `${Math.min(100, (amt / Math.max(...Object.values(tagMonthly[selectedTag]))) * 100)}%` }} />
                  </div>
                  <span className="font-mono text-white w-20 text-right">{fmt(amt)}</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Untagged income */}
      {untaggedIncome.length > 0 && (
        <motion.div variants={staggerVariants} custom={2} className="rounded-xl border border-white/5 bg-white/[0.01] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Filter className="h-3 w-3 text-white/40" />
            <span className="text-[10px] text-white/40 font-mono">{untaggedIncome.length} untagged income entries</span>
          </div>
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {untaggedIncome.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Briefcase className="h-3 w-3 text-white/30 shrink-0" />
                  <span className="text-white/60 truncate">{t.description || t.name || t.category || "Income"}</span>
                  <span className="text-white/30 font-mono">{new Date(t.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-emerald-300">{fmt(t.amount)}</span>
                  <button
                    onClick={() => setEditingTxn(editingTxn === t.id ? null : t.id)}
                    className="text-white/30 hover:text-white transition-colors"
                  >
                    <Tags className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}