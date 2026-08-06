import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Settings as SettingsIcon, LayoutDashboard, PieChart, TrendingUp, Gauge, Sparkles, PiggyBank, Activity, Briefcase, Wallet } from "lucide-react";
import CommandPalette from "@/components/finance/CommandPalette";
import BackupModal from "@/components/finance/BackupModal";
import MobileNav from "@/components/finance/MobileNav";
import NavDropdown from "@/components/finance/NavDropdown";

export default function DashboardHeader({ actions }) {
  const financesGroup = [
    { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/accounts", label: "Accounts", icon: Wallet },
    { to: "/insights", label: "Insights", icon: PieChart },
    { to: "/cashflow", label: "Cash Flow", icon: Activity },
  ];
  const planningGroup = [
    { to: "/budgeting", label: "Budgeting", icon: PiggyBank },
    { to: "/portfolio", label: "Portfolio", icon: Briefcase },
    { to: "/forecast", label: "Forecast", icon: TrendingUp },
    { to: "/credit-utilization", label: "Credit Utilization", icon: Gauge },
    { to: "/assistant", label: "Ask Wei", icon: Sparkles },
  ];

  return (
    <>
    <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10" style={{ height: 30, width: 30 }}>
            <ShieldCheck className="text-emerald-400" style={{ height: 16, width: 16 }} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">Haven</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 shrink-0 mr-auto">
          <NavDropdown label="Finances" items={financesGroup} />
          <NavDropdown label="Planning" items={planningGroup} />
        </nav>

        <div className="flex items-center gap-2.5 ml-auto shrink-0">
          <BackupModal />
          <div className="hidden xl:block"><CommandPalette /></div>
          <Link to="/settings" className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Settings">
            <SettingsIcon className="h-4 w-4" />
          </Link>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
    </header>
    <MobileNav />
    </>
  );
}