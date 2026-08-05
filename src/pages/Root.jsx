import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { CurrencyProvider } from "@/lib/currency-context";
import { FinanceDataProvider, useFinanceData } from "@/lib/FinanceDataContext";
import DashboardHeader from "@/components/finance/DashboardHeader";
import Dashboard from "@/pages/Dashboard";
import Splash from "@/pages/Splash";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

function FullSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="h-8 w-8 rounded-full border-2 border-white/15 border-t-emerald-400 animate-spin" />
    </div>
  );
}

function AuthedShell() {
  const { loading } = useFinanceData();
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-white/15 border-t-emerald-400 animate-spin" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-black text-zinc-100 dd-page-enter">
      <DashboardHeader />
      <Dashboard />
    </div>
  );
}

export default function RootGate() {
  const { isLoadingAuth, authChecked, authError, isAuthenticated } = useAuth();

  if (isLoadingAuth || !authChecked) return <FullSpinner />;

  if (authError?.type === "user_not_registered") return <UserNotRegisteredError />;

  if (!isAuthenticated) return <Splash />;

  return (
    <CurrencyProvider>
      <FinanceDataProvider>
        <AuthedShell />
      </FinanceDataProvider>
    </CurrencyProvider>
  );
}