import React from "react";
import { useAuth } from "@/lib/AuthContext";
import Splash from "@/pages/Splash";
import Dashboard from "@/pages/Dashboard";
import { FinanceShell } from "@/lib/FinanceDataContext";
import OnboardingGate from "@/components/onboarding/OnboardingGate";

function FullSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
    </div>
  );
}

// The root URL "/" conditionally renders the Haven splash (unauthenticated)
// or the full main app / dashboard (authenticated). No separate /splash or
// /dashboard routes needed — the root resolves to one or the other.
export default function RootGate() {
  const { isLoadingAuth, authChecked, isAuthenticated, authError } = useAuth();

  if (isLoadingAuth || !authChecked) return <FullSpinner />;

  // AuthenticatedApp already surfaces the not-registered screen above the
  // router, so by the time we reach here a not-registered state is unexpected.
  if (authError?.type === "user_not_registered") return null;

  if (!isAuthenticated) return <Splash />;

  return (
    <FinanceShell>
      <OnboardingGate>
        <Dashboard />
      </OnboardingGate>
    </FinanceShell>
  );
}