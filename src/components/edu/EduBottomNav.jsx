import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Ellipsis, BookOpen } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useEduSync } from "@/lib/eduSyncContext";
import { resolveNav, EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED } from "@/lib/navConfig";

// Floating pill bottom nav (mobile only) for Haven Education. Mirrors the
// Haven Finance mobile nav: up to MAX_ICONS primary pages render as icons;
// the rest sit behind the More drawer.

const MAX_ICONS = 4;

const isItemActive = (to, end, pathname) =>
  end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

export default function EduBottomNav() {
  const { navItems } = useEduSync();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { primary, more } = resolveNav(navItems, EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED);
  const icons = primary.slice(0, MAX_ICONS);
  const drawerItems = [...primary.slice(MAX_ICONS), ...more];
  const moreActive = drawerItems.some((s) => isItemActive(s.to, s.end, location.pathname));

  const iconClass = (isActive) =>
    `relative h-[18px] w-[18px] transition-colors duration-200 ${isActive ? "text-emerald-300" : "text-white/45"}`;

  return (
    <>
      <nav
        className="sm:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        aria-label="Haven Education"
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

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-sm font-mono tracking-tight text-zinc-100">
              <BookOpen className="h-4 w-4 text-emerald-400" /> Education Tools
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
    </>
  );
}