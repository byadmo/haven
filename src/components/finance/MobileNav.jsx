import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Target, LineChart, PieChart, TrendingUp, Sparkles } from "lucide-react";

const items = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/forecast", label: "Forecast", icon: TrendingUp },
  { to: "/assistant", label: "Assistant", icon: Sparkles },
  { to: "/strategy", label: "Strategy", icon: Target },
  { to: "/portfolio", label: "Portfolio", icon: LineChart },
  { to: "/insights", label: "Insights", icon: PieChart },
];

export default function MobileNav() {
  return (
    <nav className="sm:hidden fixed inset-x-0 z-30 flex justify-center pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      aria-label="Primary"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-zinc-900/95 backdrop-blur-md px-2.5 py-1.5 shadow-lg">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="flex-col items-center justify-center rounded-full transition-all duration-150 px-2.5 py-1.5">
            {({ isActive }) => (
              <div className={`flex flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-1 transition-all duration-150 ${
                isActive ? "bg-white/10" : ""
              }`}>
                <Icon className={`h-[16px] w-[16px] transition-colors ${isActive ? "text-white" : "text-white/40"}`} />
                <span className={`text-[8px] uppercase tracking-[0.1em] font-mono transition-colors ${isActive ? "text-white" : "text-white/40"}`}>
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