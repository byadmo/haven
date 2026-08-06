import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ArrowLeft, ArrowRight, Loader2, X, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { loadDraft, saveDraft, clearDraft, markFinanceProfileSkipped } from "./onboardingStorage";
import WizardStepper from "./WizardStepper";
import Step1Profile from "./steps/Step1Profile";
import Step2Accounts from "./steps/Step2Accounts";
import Step3Bills from "./steps/Step3Bills";
import Step4Debts from "./steps/Step4Debts";
import Step5Investments, { mapInvestAccount } from "./steps/Step5Investments";

const TOTAL = 5;

const initialDraft = {
  step: 1,
  profile: { income_type: "fixed", baseline_monthly_income: "", risk_tolerance: "moderate" },
  accounts: [],
  bills: [],
  debts: [],
  investments: [],
};

function pad(n) { return String(n).padStart(2, "0"); }
function clampDay(day) { const d = Math.min(31, Math.max(1, parseInt(day, 10) || 1)); return d; }

function billDate(day) {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(clampDay(day))}`;
}

function billNextDate(day, freq) {
  if (freq === "monthly") {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    return `${yr}-${pad(mo)}-${pad(clampDay(day))}`;
  }
  return billDate(day);
}

function mapRisk(value) {
  // "speculative" isn't a stored enum — collapse into aggressive.
  return value === "speculative" ? "aggressive" : value || "moderate";
}

export default function OnboardingWizard({ existingProfile, force = false, onComplete }) {
  const { refresh } = useFinanceData();
  const [draft, setDraft] = React.useState(() => {
    const loaded = loadDraft();
    if (existingProfile) {
      loaded.profile = {
        income_type: existingProfile.income_type || "fixed",
        baseline_monthly_income: existingProfile.baseline_monthly_income ?? "",
        risk_tolerance: existingProfile.risk_tolerance || "moderate",
      };
    }
    return { ...initialDraft, ...loaded };
  });
  const [finishing, setFinishing] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const step = draft.step;

  const profileValid =
    !!draft.profile.income_type && String(draft.profile.baseline_monthly_income).trim() !== "";

  function next() {
    setError(null);
    if (step < TOTAL) set({ step: step + 1 });
    else finish();
  }
  function back() {
    setError(null);
    if (step > 1) set({ step: step - 1 });
  }
  function skip() {
    setError(null);
    if (step < TOTAL) set({ step: step + 1 });
  }
  function skipAll() {
    markFinanceProfileSkipped();
    if (onComplete) onComplete();
  }

  async function finish() {
    setError(null);
    setFinishing(true);
    try {
      // 1) Profile
      const profilePayload = {
        income_type: draft.profile.income_type === "variable" ? "variable" : "fixed",
        baseline_monthly_income: Number(draft.profile.baseline_monthly_income) || 0,
        risk_tolerance: mapRisk(draft.profile.risk_tolerance),
        onboarding_completed: true,
        last_adaptation_date: new Date().toISOString().slice(0, 10),
      };
      if (existingProfile?.id) {
        await base44.entities.UserFinancialProfile.update(existingProfile.id, profilePayload);
      } else {
        await base44.entities.UserFinancialProfile.create(profilePayload);
      }

      // 2) Cash accounts (chequing/savings only)
      const cash = draft.accounts
        .filter((a) => a.name && (a.type === "chequing" || a.type === "savings"))
        .map((a) => ({ name: a.name, type: a.type, balance: Number(a.balance) || 0 }));
      if (cash.length) await base44.entities.Account.bulkCreate(cash);

      // 3) Recurring bills → scheduled transactions
      const txns = draft.bills
        .filter((b) => b.description)
        .map((b) => {
          const freq = ["monthly", "biweekly", "yearly", "one_time"].includes(b.frequency) ? b.frequency : "monthly";
          return {
            description: b.description,
            amount: Number(b.amount) || 0,
            type: "expense",
            category: b.category || "Other",
            date: billDate(b.day),
            is_scheduled: true,
            frequency: freq,
            next_date: billNextDate(b.day, freq),
          };
        });
      if (txns.length) await base44.entities.Transaction.bulkCreate(txns);

      // 4) Debts
      const debts = draft.debts
        .filter((d) => d.name)
        .map((d) => ({
          name: d.name,
          current_balance: Number(d.current_balance) || 0,
          original_balance: Number(d.original_balance) || 0,
          interest_rate: Number(d.interest_rate) || 0,
          minimum_payment: Number(d.minimum_payment) || 0,
          due_date: d.due_date || undefined,
          status: "active",
        }));
      if (debts.length) await base44.entities.Debt.bulkCreate(debts);

      // 5) Investments → Stock records (account enum derived from detected account name)
      const stocks = draft.investments
        .filter((s) => s.symbol)
        .map((s) => ({
          symbol: String(s.symbol).toUpperCase(),
          name: s.name || "",
          shares: Number(s.shares) || 0,
          avg_buy_price: Number(s.avg_buy_price) || 0,
          account: INVEST_ACCOUNT_KEYS.includes(s.account) ? s.account : mapInvestAccount(s.account),
        }));
      if (stocks.length) await base44.entities.Stock.bulkCreate(stocks);

      refresh();
      clearDraft();
      set({ step: TOTAL + 1 }); // completion screen
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1800);
    } catch (e) {
      setError(e?.message || "Something went wrong saving your setup. Please try again.");
      setFinishing(false);
    }
  }

  const isDone = step > TOTAL;
  const isLast = step === TOTAL;
  const canAdvance = step === 1 ? profileValid : true;

  return (
    <div className="dd-page-enter dark min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-emerald-500/30">
      <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-mono text-sm tracking-tight text-zinc-200">Haven Setup</span>
          </div>
          {force && (
            <button
              onClick={onComplete}
              className="text-white/40 hover:text-white text-xs font-mono flex items-center gap-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Exit setup
            </button>
          )}
          {!force && (
            <button
              onClick={skipAll}
              className="text-white/40 hover:text-white text-xs font-mono transition-colors"
            >
              Skip for now — complete later in Settings
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 backdrop-blur-xl p-5 sm:p-7 flex-1 flex flex-col">
          {!isDone && <WizardStepper step={step} />}

          <div className="flex-1 mt-5">
            <AnimatePresence mode="wait">
              {isDone ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-full flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 14 }}
                    className="h-16 w-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                  </motion.div>
                  <h2 className="text-xl font-semibold font-mono tracking-tight text-zinc-100">Setup Complete</h2>
                  <p className="text-sm text-white/50 mt-1.5 max-w-xs">
                    Your financial command center is ready. Taking you to your dashboard…
                  </p>
                  <Loader2 className="h-4 w-4 text-emerald-400 animate-spin mt-4" />
                </motion.div>
              ) : (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 1 && <Step1Profile profile={draft.profile} setProfile={(p) => set({ profile: p })} />}
                  {step === 2 && <Step2Accounts items={draft.accounts} setItems={(v) => set({ accounts: v })} />}
                  {step === 3 && <Step3Bills items={draft.bills} setItems={(v) => set({ bills: v })} />}
                  {step === 4 && <Step4Debts items={draft.debts} setItems={(v) => set({ debts: v })} />}
                  {step === 5 && <Step5Investments items={draft.investments} setItems={(v) => set({ investments: v })} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300">
              {error}
            </div>
          )}

          {!isDone && (
            <div className="flex items-center justify-between gap-2 mt-6 pt-5 border-t border-white/10">
              <button
                onClick={back}
                disabled={step === 1 || finishing}
                className="h-9 px-3 rounded-md text-sm font-mono text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <div className="flex items-center gap-2">
                {step > 1 && (
                  <button
                    onClick={skip}
                    disabled={finishing}
                    className="h-9 px-4 rounded-md text-sm font-mono text-white/50 hover:text-white border border-white/10 hover:border-white/25 disabled:opacity-40 transition-colors"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={next}
                  disabled={!canAdvance || finishing}
                  className="h-9 px-5 rounded-md text-sm font-mono bg-emerald-600 hover:bg-emerald-500 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                >
                  {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : isLast ? "Finish Setup" : "Next"}
                  {!finishing && (isLast ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const INVEST_ACCOUNT_KEYS = ["TFSA", "RRSP", "FHSA", "RESP", "Non-Registered", "Cash", "Other"];