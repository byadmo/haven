import React from "react";
import { Link, NavLink } from "react-router-dom";
import {
  ShieldCheck,
  Settings as SettingsIcon,
  LayoutDashboard,
  Target,
  PiggyBank,
  Wallet,
  ArrowLeft,
  ArrowLeftRight,
  CreditCard,
  PieChart,
  TrendingUp,
  Gauge,
  Sparkles,
  Activity,
  Briefcase,
} from "lucide-react";
import CommandPalette from "@/components/finance/CommandPalette";
import BackupModal from "@/components/finance/BackupModal";
import MobileNav from "@/components/finance/MobileNav";
import NavDropdown from "@/components/finance/NavDropdown";

// PRIMARY — shown directly in the top nav and bottom pill.
const primary = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
];

// SECONDARY — grouped under the "More" dropdown.
const moreItems = [
  { to: "/debts", label: "Debts", icon: CreditCard },
  { to: "/budgeting", label: "Budgets", icon: PiggyBank },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/insights", label: "Insights", icon: PieChart },
  { to: "/cashflow", label: "Cash Flow", icon: Activity },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/credit-utilization", label: "Credit Utilization", icon: Gauge },
  { to: "/assistant", label: "Ask Wei", icon: Sparkles },
  { to: "/", label: "Haven Hub", icon: ShieldCheck, end: true },
];

function TopNavLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 h-9 rounded-md text-xs font-medium transition-colors ${
          isActive
            ? "text-emerald-300 bg-emerald-500/10 border border-emerald-400/30"
            : "text-white/55 hover:text-white hover:bg-white/5 border border-transparent"
        }`
      }
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}

export default function DashboardHeader({ actions }) {
  return (
    <>
      <header
        className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 select-none"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-16 flex items-center gap-3">
          <Link to="/" title="Back to Haven Hub" className="flex items-center gap-2 shrink-0 group rounded-md px-1.5 -mx-1.5 py-1 hover:bg-white/5 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 text-white/40 group-hover:text-emerald-300 transition-colors" strokeWidth={2} />
            <div
              className="flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 group-hover:border-emerald-400/50 transition-colors"
              style={{ height: 30, width: 30 }}
            >
              <ShieldCheck className="text-emerald-400" style={{ height: 16, width: 16 }} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              Haven <span className="text-emerald-400">Financial</span>
            </span>
          </Link>

          {/* Desktop top nav: primary pages + "More" dropdown for secondary */}
          <nav className="hidden sm:flex items-center gap-1 shrink-0 mr-auto">
            {primary.map((p) => (
              <TopNavLink key={p.to} {...p} />
            ))}
            <NavDropdown label="More" items={moreItems} />
          </nav>

          <div className="flex items-center gap-2.5 ml-auto shrink-0">
            <BackupModal />
            <div className="hidden xl:block">
              <CommandPalette />
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>
      </header>
      <MobileNav />
    </>
  );
}