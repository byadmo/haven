import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, ArrowLeftRight, TrendingUp, Target } from "lucide-react";

const items = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/accounts", label: "Transactions", icon: Search },
  { to: "/strategy", label: "Debts", icon: ArrowLeftRight },
  { to: "/portfolio", label: "Investments", icon: TrendingUp },
  { to: "/budgeting", label: "Goals", icon: Target },
];

export default function MobileNav() {
  return (
    <nav
      className="sm:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      aria-label="Primary"
    >
      <div
        className="pointer-events-auto flex items-center justify-between rounded-full border border-white/10 bg-black/75 px-2"
        style={{
          height: 56,
          width: "min(92vw, 360px)",
          borderRadius: 999,
          boxShadow: "0 10px 30px -8px rgba(0,0,0,0.6), 0 2px 8px -4px rgba(0,0,0,0.4)",
        }}
      >
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="relative grid place-items-center rounded-full transition-colors"
            style={{ height: 48, width: 48 }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-1 rounded-full border border-emerald-400/30 bg-emerald-500/15"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon
                  className={`relative h-[18px] w-[18px] transition-colors ${
                    isActive ? "text-emerald-300" : "text-white/45"
                  }`}
                  strokeWidth={1.75}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}