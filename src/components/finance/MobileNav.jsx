import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Target, LineChart, PieChart } from "lucide-react";

const items = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/strategy", label: "Strategy", icon: Target },
  { to: "/portfolio", label: "Portfolio", icon: LineChart },
  { to: "/insights", label: "Insights", icon: PieChart },
];

export default function MobileNav() {
  const cls = ({ isActive }) =>
    `flex flex-col items-center justify-center gap-0.5 py-2 transition-colors duration-150 ${
      isActive ? "text-emerald-400" : "text-white/40"
    }`;
  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-black"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={cls}>
            <Icon className="h-5 w-5" />
            <span className="text-[9px] uppercase tracking-widest font-mono">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}