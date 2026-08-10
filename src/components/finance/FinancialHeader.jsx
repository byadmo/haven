import React, { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  ArrowLeft,
  Pencil,
  Ellipsis,
  PieChart,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import CustomizeNavModal from "@/components/nav/CustomizeNavModal";
import CommandPalette from "@/components/finance/CommandPalette";
import BackupModal from "@/components/finance/BackupModal";
import { useFinanceData } from "@/lib/FinanceDataContext";
import { resolveNav, FINANCE_PAGES, FINANCE_DEFAULT_NAV, FINANCE_LOCKED } from "@/lib/navConfig";

const MAX_ICONS = 4;

const isItemActive = (to, end, pathname) =>
  end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

export default function FinancialHeader() {
  const { navItems, saveNavItems } = useFinanceData();
  const location = useLocation();
  const navigate = useNavigate();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const { primary, more } = resolveNav(navItems, FINANCE_PAGES, FINANCE_DEFAULT_NAV, FINANCE_LOCKED);
  const icons = primary.slice(0, MAX_ICONS);
  const drawerItems = [...primary.slice(MAX_ICONS), ...more];
  const moreActive = drawerItems.some(s => isItemActive(s.to, s.end, location.pathname));
  const activeIndex = icons.findIndex(p => isItemActive(p.to, p.end, location.pathname));

  const iconClass = (isActive) =>
    `relative h-[18px] w-[18px] transition-colors duration-200 ${isActive ? "text-emerald-300" : "text-white/45"}`;

  return (
    <>
      {/* Top nav bar — Growth-aligned glassmorphism */}
      <header
        className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 select-none"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center gap-3">
          {/* Back to Hub + Logo */}
          <Link to="/" viewTransition title="Back to Haven Hub" className="flex items-center gap-2 shrink-0 group rounded-md px-1.5 -mx-1.5 py-1 hover:bg-white/5 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5 text-white/40 group-hover:text-emerald-300 transition-colors" strokeWidth={2} />
            <div className="flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10 transition-colors group-hover:border-emerald-400/50" style={{ height: 30, width: 30, viewTransitionName: "haven-logo" }}>
              <ShieldCheck className="text-emerald-400" style={{ height: 16, width: 16 }} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">Haven Financial</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1 ml-2 overflow-x-auto">
            {primary.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                viewTransition
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 h-9 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? "text-emerald-300 bg-emerald-500/10 border border-emerald-400/30"
                      : "text-white/55 hover:text-white hover:bg-white/5 border border-transparent"
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            <CommandPalette />
            <BackupModal />
            <button
              onClick={() => setCustomizeOpen(true)}
              className="h-8 w-8 grid place-items-center rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Customize nav"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav — Growth-aligned floating pill */}
      <nav
        className="sm:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        aria-label="Primary"
      >
        <div
          className="pointer-events-auto relative flex items-center justify-between rounded-full border border-white/10 bg-black/90 backdrop-blur-xl px-2"
          style={{ height: 56, width: "min(94vw, 392px)", borderRadius: 999, boxShadow: "0 10px 30px -8px rgba(0,0,0,0.6), 0 2px 8px -4px rgba(0,0,0,0.4)" }}
        >
          {icons.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              viewTransition
              aria-label={label}
              className="relative grid place-items-center rounded-full"
              style={{ height: 48, width: 48 }}
            >
              {({ isActive }) => <Icon className={iconClass(isActive)} strokeWidth={1.75} />}
            </NavLink>
          ))}

          {drawerItems.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More"
              className="relative grid place-items-center rounded-full"
              style={{ height: 48, width: 48 }}
            >
              <Ellipsis className={iconClass(moreActive)} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </nav>

      {/* Drawer for "More" items */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-sm font-mono tracking-tight text-zinc-100">
              <PieChart className="h-4 w-4 text-emerald-400" /> Finance Tools
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-6 pt-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
            {drawerItems.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => { setMoreOpen(false); navigate(to, { viewTransition: true }); }}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-3.5 text-left transition-colors ${
                  location.pathname === to
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-black text-zinc-300 hover:border-white/25"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {customizeOpen && (
        <CustomizeNavModal
          open={customizeOpen}
          onOpenChange={setCustomizeOpen}
          pages={FINANCE_PAGES}
          defaultNav={FINANCE_DEFAULT_NAV}
          locked={FINANCE_LOCKED}
          navItems={navItems}
          onSave={saveNavItems}
          accent="indigo"
          title="Customize Finance Navigation"
        />
      )}
    </>
  );
}