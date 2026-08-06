import React from "react";
import { NavLink } from "react-router-dom";
import { EDU_NAV } from "@/lib/eduSyncContext";

export default function EduBottomNav() {
  return (
    <nav
      className="sm:hidden fixed inset-x-0 z-40 flex justify-center pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      aria-label="Haven Education"
    >
      <div
        className="pointer-events-auto relative flex items-center justify-between rounded-full border border-white/10 bg-black/80 px-1.5"
        style={{
          height: 56,
          width: "min(96vw, 440px)",
          boxShadow: "0 10px 30px -8px rgba(0,0,0,0.6), 0 2px 8px -4px rgba(0,0,0,0.4)",
        }}
      >
        {EDU_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className="relative grid place-items-center rounded-full transition-colors"
            style={{ height: 48, width: 48, flex: 1 }}
          >
            {({ isActive }) => (
              <span className={`grid place-items-center rounded-full h-9 w-9 transition-colors ${isActive ? "bg-emerald-500/15 border border-emerald-400/30" : ""}`}>
                <Icon
                  className={`h-[18px] w-[18px] transition-colors ${isActive ? "text-emerald-300" : "text-white/45"}`}
                  strokeWidth={1.75}
                />
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}