import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Repeat, TrendingUp, TrendingDown, Scissors, DollarSign, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { useCurrency } from "@/lib/currency-context";
import { Button } from "@/components/ui/button";

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

export default function SubscriptionManager() {
  const { recurringBills, transactions, refresh } = useFinanceData();
  const { fmtMoney: fmt } = useCurrency();
  const [cancelling, setCancelling] = useState(null);

  // Identify subscriptions from recurring bills
  const subscriptions = useMemo(() => {
    const billMap = {};
    // Get recurring bills that look like subscriptions
    (recurringBills || []).forEach((b) => {
      const name = (b.name || "").toLowerCase();
      const cat = (b.category || "").toLowerCase();
      // Likely subscriptions: streaming, SaaS, memberships, apps
      const subKeywords = ["netflix", "spotify", "apple", "google", "adobe", "microsoft", "notion", "figma", "midjourney", "chatgpt", "copilot", "github", "aws", "digitalocean", "vercel", "slack", "zoom", "dropbox", "discord", "patreon", "substack", "medium", "strava", "gym", "membership", "subscription", "saas", "software", "cloud", "hosting", "domain", "vpn", "newsletter"];
      const isSub = subKeywords.some((k) => name.includes(k) || cat.includes(k));
      if (isSub) {
        billMap[b.name || "Unnamed"] = { ...b, _isSubscription: true };
      }
    });

    // Also check transactions for recurring subscriptions
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentTxns = transactions.filter((t) => {
      if (t.amount >= 0) return false;
      try { return new Date(t.date) >= threeMonthsAgo; } catch { return false; }
    });

    // Group similar transactions by merchant name pattern
    const merchantGroups = {};
    recentTxns.forEach((t) => {
      const name = (t.name || t.description || t.category || "").trim();
      if (!name) return;
      merchantGroups[name] = merchantGroups[name] || [];
      merchantGroups[name].push(t);
    });

    // Find merchants with 3+ occurrences (likely subscriptions)
    Object.entries(merchantGroups).forEach(([name, txns]) => {
      if (txns.length >= 2 && !billMap[name]) {
        const cat = (txns[0].category || "").toLowerCase();
        const subKeywords = ["subscription", "monthly", "recurring", "streaming", "saas", "membership", "cloud", "hosting", "domain"];
        if (subKeywords.some((k) => cat.includes(k)) || txns.length >= 3) {
          billMap[name] = {
            name,
            amount: Math.abs(txns[txns.length - 1].amount),
            original_amount: Math.abs(txns[0].amount),
            frequency: "monthly",
            category: txns[0].category,
            _detected: true,
            _detectedCount: txns.length,
            _detectedMonths: txns.map((t) => new Date(t.date).toLocaleString("default", { month: "short" })),
          };
        }
      }
    });

    return Object.values(billMap).sort((a, b) => Math.abs(b.amount || 0) - Math.abs(a.amount || 0));
  }, [recurringBills, transactions]);

  const annualTotal = useMemo(() => {
    return subscriptions.reduce((s, sub) => {
      const monthly = Math.abs(sub.amount || 0);
      if (sub.frequency === "yearly") return s + monthly;
      if (sub.frequency === "weekly") return s + monthly * 52 / 12;
      return s + monthly;
    }, 0) * 12;
  }, [subscriptions]);

  // Detect price increases
  const priceChanges = useMemo(() => {
    return subscriptions.filter((s) => {
      const curr = Math.abs(s.amount || 0);
      const orig = Math.abs(s.original_amount || curr);
      return orig > 0 && curr > orig && (curr - orig) / orig > 0.05;
    });
  }, [subscriptions]);

  const handleCancel = async (sub) => {
    if (!sub.id) return;
    setCancelling(sub.id);
    try {
      await base44.entities.RecurringBill.update(sub.id, { active: false, notes: "Cancelled via Haven" });
      refresh();
    } catch (e) {
      console.error("Failed to cancel subscription:", e);
    }
    setCancelling(null);
  };

  if (!subscriptions.length) return null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      {/* Summary header */}
      <motion.div variants={staggerVariants} custom={0}
        className="flex items-center justify-between p-3 rounded-xl border border-rose-500/20 bg-rose-500/5"
      >
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-rose-400" />
          <div>
            <p className="text-sm font-semibold text-white">{subscriptions.length} Active Subscriptions</p>
            <p className="text-[10px] text-white/40">{fmt(annualTotal)} / year</p>
          </div>
        </div>
        {priceChanges.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md">
            <TrendingUp className="h-3 w-3" />
            {priceChanges.length} price change{priceChanges.length > 1 ? "s" : ""}
          </div>
        )}
      </motion.div>

      {/* Creep warnings */}
      {priceChanges.length > 0 && (
        <motion.div variants={staggerVariants} custom={1}
          className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">Subscription Creep Detected</span>
          </div>
          <div className="space-y-1.5">
            {priceChanges.slice(0, 5).map((s, i) => {
              const curr = Math.abs(s.amount || 0);
              const orig = Math.abs(s.original_amount || curr);
              const pct = orig > 0 ? Math.round(((curr - orig) / orig) * 100) : 0;
              return (
                <div key={s.id || s.name || i} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">{s.name}</span>
                  <span className="text-rose-400 font-mono">+{pct}% ({fmt(curr - orig)}/mo)</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Subscription list */}
      <div className="space-y-1">
        {subscriptions.slice(0, 10).map((sub, i) => {
          const monthly = Math.abs(sub.amount || 0);
          const yearly = monthly * (sub.frequency === "yearly" ? 1 : sub.frequency === "weekly" ? 52 / 12 : 12);
          return (
            <motion.div
              key={sub.id || sub.name || i}
              variants={staggerVariants}
              custom={i + 2}
              className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`h-2 w-2 rounded-full ${sub._detected ? "bg-blue-400" : sub.active === false ? "bg-zinc-600" : "bg-emerald-400"}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-white truncate">{sub.name}</p>
                  <p className="text-[9px] text-white/40">
                    {sub._detected ? "Auto-detected" : sub.frequency || "Monthly"}
                    {sub._detected && ` · ${sub._detectedMonths?.join(", ")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className="text-xs font-mono tabular-nums text-white">{fmt(monthly)}<span className="text-[9px] text-white/40">/mo</span></p>
                  <p className="text-[9px] font-mono text-white/30">{fmt(yearly)}<span className="text-[9px] text-white/20">/yr</span></p>
                </div>
                {sub.active !== false && sub.id && (
                  <button
                    onClick={() => handleCancel(sub)}
                    disabled={cancelling === sub.id}
                    className="h-7 w-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-rose-400 transition-all"
                    title="Mark as cancelled"
                  >
                    {cancelling === sub.id ? (
                      <div className="h-3 w-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}