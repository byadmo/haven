import React from "react";
import { Target, CreditCard, TrendingUp, Search } from "lucide-react";

export function EmptyGoals({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
        <Target className="h-8 w-8 text-amber-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">No goals yet</h3>
      <p className="text-xs text-white/40 text-center max-w-xs mb-4">
        Set savings targets, debt-payoff milestones, or investment goals. Every journey starts with a goal.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          <Target className="h-3.5 w-3.5" /> Create Your First Goal
        </button>
      )}
    </div>
  );
}

export function EmptyDebts({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <CreditCard className="h-8 w-8 text-emerald-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">No debts tracked</h3>
      <p className="text-xs text-white/40 text-center max-w-xs mb-4">
        You're debt-free! Or you haven't added any liabilities yet. Add your first debt to track payoff progress.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/20 px-4 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
        >
          <CreditCard className="h-3.5 w-3.5" /> Add Your First Debt
        </button>
      )}
    </div>
  );
}

export function EmptyTransactions({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
        <TrendingUp className="h-8 w-8 text-blue-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">No transactions yet</h3>
      <p className="text-xs text-white/40 text-center max-w-xs mb-4">
        Import a bank statement, or add your first transaction to start tracking your finances.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-400/20 px-4 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/20 transition-colors"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Add Your First Transaction
        </button>
      )}
    </div>
  );
}

export function EmptyCredit() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-20 w-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
        <Search className="h-8 w-8 text-purple-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-zinc-100 mb-1">No credit data</h3>
      <p className="text-xs text-white/40 text-center max-w-xs">
        Add a credit account with a limit to track your utilization. Keep it under 30% for a healthy score.
      </p>
    </div>
  );
}