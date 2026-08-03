import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Wallet, Settings as SettingsIcon } from "lucide-react";
import { format } from "date-fns";
import CommandPalette from "@/components/finance/CommandPalette";
import BackupModal from "@/components/finance/BackupModal";
import MobileNav from "@/components/finance/MobileNav";

export default function DashboardHeader({ actions }) {
  const now = new Date();
  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors duration-150 ${
      isActive ? "text-emerald-400 border-b-2 border-emerald-400" : "text-white/50 hover:text-white border-b-2 border-transparent"
    }`;

  return (
    <>
    <header className="sticky top-0 z-30 bg-black border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-2 space-y-2">
        {/* Top segment — brand · date · settings */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0F0F0F] px-3.5 h-11">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="h-6 w-6 rounded-md flex items-center justify-center bg-emerald-500 text-black shrink-0">
              <Wallet className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-2 font-mono uppercase tracking-widest text-[11px] truncate">
              <span className="text-zinc-50 font-bold tracking-tight text-sm">HAVEN</span>
              <span className="text-white/20">·</span>
              <span className="text-white/50 hidden sm:inline">{format(now, "EEEE")}</span>
              <span className="text-white/20 hidden sm:inline">·</span>
              <span className="text-white/50">{format(now, "MMM d")}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-px bg-white/10" />
            <Link to="/settings" className="h-7 w-7 rounded-md border border-white/10 bg-black flex items-center justify-center text-zinc-400 hover:border-white/30 hover:text-white transition-colors" aria-label="Settings">
              <SettingsIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        {/* Bottom segment — nav · search · actions */}
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[#0F0F0F] px-3.5 h-11 gap-3">
          <nav className="hidden sm:flex items-center gap-1 min-w-0">
            <NavLink to="/" className={linkClass} end>Overview</NavLink>
            <NavLink to="/forecast" className={linkClass}>Forecast</NavLink>
            <NavLink to="/assistant" className={linkClass}>Ask Adam</NavLink>
            <NavLink to="/strategy" className={linkClass}>Strategy</NavLink>
            <NavLink to="/portfolio" className={linkClass}>Portfolio</NavLink>
            <NavLink to="/insights" className={linkClass}>Insights</NavLink>
          </nav>
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden sm:block"><CommandPalette /></div>
            <BackupModal />
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        </div>
      </div>
    </header>
    <MobileNav />
    </>
  );
}