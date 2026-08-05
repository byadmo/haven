import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Target, LineChart, PieChart, TrendingUp, Sparkles, PiggyBank } from "lucide-react";

const items = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/budgeting", label: "Budget", icon: PiggyBank },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/strategy", label: "Strategy", icon: Target },
  { to: "/portfolio", label: "Portfolio", icon: LineChart },
  { to: "/insights", label: "Insights", icon: PieChart },
  { to: "/assistant", label: "Ask Wei", icon: Sparkles },
];

export default function MobileNav() {
  return (
    <nav className="sm:hidden fixed inset-x-0 z-30 flex justify-center pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px + 5vh)" }}
      aria-label="Primary"
    >
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/10 bg-zinc-900/95 backdrop-blur-md px-2 py-1 shadow-lg scale-110">
        {items.map(({ to, label, icon: Icon, end }, i) => (
          <NavLink key={to} to={to} end={end} className={`flex-col items-center justify-center rounded-full transition-all duration-150 py-1 ${
            i === 0 ? "pl-3 pr-1.5" : i === items.length - 1 ? "pr-3 pl-1.5" : "px-1.5"
          }`}>
            {({ isActive }) => (
              <div className={`flex flex-col items-center justify-center rounded-full px-1 py-0.5 transition-all duration-150 ${
                isActive ? "bg-white/10" : ""
              }`}>
                <Icon className={`h-[15px] w-[15px] transition-colors ${isActive ? "text-white" : "text-white/40"}`} />
                <span className={`text-[7px] uppercase tracking-[0.05em] font-mono transition-colors ${isActive ? "text-white" : "text-white/40"}`}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}