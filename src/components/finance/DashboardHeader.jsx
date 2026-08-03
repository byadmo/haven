import React from "react";
import { Link } from "react-router-dom";
import { Wallet, Settings as SettingsIcon, LayoutDashboard, LineChart, PieChart, TrendingUp, Target, Sparkles } from "lucide-react";
import CommandPalette from "@/components/finance/CommandPalette";
import BackupModal from "@/components/finance/BackupModal";
import MobileNav from "@/components/finance/MobileNav";
import NavDropdown from "@/components/finance/NavDropdown";

export default function DashboardHeader({ actions }) {
  const financesGroup = [
    { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/portfolio", label: "Portfolio", icon: LineChart },
    { to: "/insights", label: "Insights", icon: PieChart },
  ];
  const planningGroup = [
    { to: "/forecast", label: "Forecast", icon: TrendingUp },
    { to: "/strategy", label: "Strategy", icon: Target },
    { to: "/assistant", label: "Ask Adam", icon: Sparkles },
  ];

  return (
    <>
    <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 select-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="h-7 w-7 rounded-md flex items-center justify-center bg-emerald-500 text-black">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-sm font-bold tracking-tight text-zinc-50">HAVEN</span>
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 shrink-0 mr-auto">
          <NavDropdown label="Finances" items={financesGroup} />
          <NavDropdown label="Planning" items={planningGroup} />
        </nav>

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
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