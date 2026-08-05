import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  ArrowLeftRight,
  TrendingUp,
  PiggyBank,
  Ellipsis,
  Activity,
  LineChart,
  PieChart,
  Sparkles,
  Wallet,
  Gauge,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const primary = [
  { to: "/", label: "Overview", icon: Home, end: true },
  { to: "/insights", label: "Insights", icon: PieChart },
  { to: "/strategy", label: "Debts", icon: ArrowLeftRight },
  { to: "/portfolio", label: "Investments", icon: TrendingUp },
  { to: "/budgeting", label: "Goals", icon: PiggyBank },
];

const secondary = [
  { to: "/credit-utilization", label: "Credit Util.", icon: Gauge },
  { to: "/cashflow", label: "Cash Flow", icon: Activity },
  { to: "/forecast", label: "Forecast", icon: LineChart },
  { to: "/assistant", label: "Ask Wei", icon: Sparkles },
];

export default function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const moreActive = secondary.some((s) => location.pathname === s.to);

  const activePill = (show) =>
    show ? (
      <motion.span
        layoutId="nav-active-pill"
        className="absolute inset-1 rounded-full border border-emerald-400/30 bg-emerald-500/15"
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      />
    ) : null;

  return (
    <>
      <nav
        className="sm:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        aria-label="Primary"
      >
        <div
          className="pointer-events-auto flex items-center justify-between rounded-full border border-white/10 bg-black/75 px-2"
          style={{
            height: 56,
            width: "min(94vw, 392px)",
            borderRadius: 999,
            boxShadow: "0 10px 30px -8px rgba(0,0,0,0.6), 0 2px 8px -4px rgba(0,0,0,0.4)",
          }}
        >
          {primary.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className="relative grid place-items-center rounded-full"
              style={{ height: 48, width: 48 }}
            >
              {({ isActive }) => (
                <>
                  {activePill(isActive)}
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

          {/* More button → secondary pages */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="More"
            className="relative grid place-items-center rounded-full"
            style={{ height: 48, width: 48 }}
          >
            {activePill(moreActive)}
            <Ellipsis
              className={`relative h-[18px] w-[18px] transition-colors ${
                moreActive ? "text-emerald-300" : "text-white/45"
              }`}
              strokeWidth={1.75}
            />
          </button>
        </div>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-sm font-mono tracking-tight text-zinc-100">
              <Wallet className="h-4 w-4 text-emerald-400" /> More
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-6 pt-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
            {secondary.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <button
                  key={to}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(to);
                  }}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3.5 text-left transition-colors ${
                    isActive
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                      : "border-white/10 bg-black text-zinc-300 hover:border-white/25"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}