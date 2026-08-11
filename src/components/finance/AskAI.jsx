import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, MessageSquare } from "lucide-react";

const PAGE_PROMPTS = {
  "/overview": "What's my financial health summary this month? Where can I improve?",
  "/allocation": "Analyze my spending breakdown. Am I following the 50/30/20 rule?",
  "/goals": "How am I tracking against my goals? What should I prioritize?",
  "/debts": "Which debt should I pay off first? What's my best strategy?",
  "/credit-utilization": "How healthy is my credit usage? What can I improve?",
  "/accounts": "Give me a summary of my accounts and balances.",
  "/transactions": "What patterns do you see in my transactions? Any unusual spending?",
  "/recurring-bills": "How much am I spending on subscriptions and bills? Any I can cut?",
};

export default function AskAI({ path }) {
  const navigate = useNavigate();
  const prompt = PAGE_PROMPTS[path] || "Help me understand my finances better.";

  function handleClick() {
    // Navigate to the assistant page with the prompt pre-filled
    navigate(`/assistant?prompt=${encodeURIComponent(prompt)}`);
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400/30 transition-colors"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Ask AI</span>
      <MessageSquare className="h-3 w-3 sm:hidden" />
    </button>
  );
}