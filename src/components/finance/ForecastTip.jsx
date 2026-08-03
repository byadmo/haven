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

      const highestAPR = Math.max(...debts.filter(d => d.current_balance > 0).map(d => d.interest_rate || 0));
      const smallestBalance = Math.min(...debts.filter(d => d.current_balance > 0).map(d => d.current_balance || 0));

      const prompt = `You are a financial advisor. Give a concise, straight-to-the-point recommendation. Exactly 2 sentences. No fluff.

Sentence 1: Recommend Avalanche or Snowball strategy and say why based on their debts.
Sentence 2: One specific action to take (e.g. "Add $X more per month to [debt name]" or "Your surplus of $Y is enough to pay off by [date] — just keep going").

User's debts:
${debtList.join("\n")}

Highest APR: ${highestAPR}%, Smallest balance: $${smallestBalance.toFixed(2)}
Currently using: ${method}
Total debt: $${totalDebt.toFixed(2)}, Min payments: $${totalMin.toFixed(2)}/mo, Extra: $${extra.toFixed(2)}/mo
Monthly income: $${recIn.toFixed(2)}, Monthly expenses: $${recOut.toFixed(2)}, Surplus: $${(recIn - recOut).toFixed(2)}/mo
Cash on hand: $${totalCash.toFixed(2)}, Projected debt-free: ${debtFreeDate}

Format: Two sentences only. Start with the strategy recommendation.`;

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