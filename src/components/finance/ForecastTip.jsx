import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/FinanceDataContext";

export default function ForecastTip({ series, extra, method }) {
  const { debts, accounts, transactions } = useFinanceData();
  const [tip, setTip] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function getTip() {
    setLoading(true);
    setTip("");
    try {
      const totalDebt = debts.reduce((s, d) => s + (d.current_balance || 0), 0);
      const totalMin = debts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
      const totalCash = accounts.reduce((s, a) => s + (a.balance || 0), 0);

      const recurring = transactions.filter((t) => t.is_scheduled || (t.frequency && t.frequency !== "one_time"));
      const recIn = recurring.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const recOut = recurring.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

      const debtFreePoint = series?.find((p) => p.debtRemaining <= 0.005);
      const debtFreeDate = debtFreePoint ? format(debtFreePoint.date, "MMMM yyyy") : "not projected within 10 years";

      const debtList = debts
        .filter((d) => (d.current_balance || 0) > 0)
        .map((d) => `${d.name}: $${(d.current_balance || 0).toFixed(2)} at ${(d.interest_rate || 0)}% (${d.interest_type || "APR"}), min $${(d.minimum_payment || 0).toFixed(2)}/mo`);

      const prompt = `You are a friendly financial advisor. Based on the user's financial snapshot below, give ONE specific, actionable tip (max 3 sentences) on what they should do to improve their debt payoff plan. Be direct, practical, and encouraging. Do not use bullet points — just write 2-3 sentences.

Total debt: $${totalDebt.toFixed(2)}
Total minimum payments: $${totalMin.toFixed(2)}/month
Extra monthly payment: $${extra.toFixed(2)}/month
Total cash on hand: $${totalCash.toFixed(2)}
Strategy: ${method} (${method === "avalanche" ? "highest interest first" : "smallest balance first"})
Recurring monthly income: $${recIn.toFixed(2)}
Recurring monthly expenses: $${recOut.toFixed(2)}
Projected debt-free date: ${debtFreeDate}

Individual debts:
${debtList.join("\n")}

Recommend a specific action: e.g. increase the extra payment by $X, switch from ${method} to the other strategy because of [specific debt], prioritize a specific debt, or address a cash flow issue. Keep it to one clear recommendation.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      const text = typeof result === "string" ? result : result?.response || result?.text || JSON.stringify(result);
      setTip(text);
    } catch (e) {
      setTip("Couldn't generate a tip right now — try again in a moment.");
    }
    setLoading(false);
  }

  return (
    <div>
      <Button
        onClick={getTip}
        disabled={loading}
        variant="outline"
        className="border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Analyzing..." : "Get AI Tip"}
      </Button>
      {tip && (
        <div className="mt-3 p-4 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-200 leading-relaxed">{tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}