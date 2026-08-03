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
    <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="h-7 w-7 rounded-md flex items-center justify-center bg-emerald-500 text-black">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-sm font-bold tracking-tight text-zinc-50">HAVEN</span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-white/40">{format(now, "EEE · MMM d")}</span>
          </div>
        </Link>

        <div className="hidden sm:block h-5 w-px bg-white/10" />

        <nav className="hidden sm:flex items-center min-w-0 flex-1 overflow-visible">
          <NavLink to="/" className={linkClass} end>Overview</NavLink>
          <NavLink to="/forecast" className={linkClass}>Forecast</NavLink>
          <NavLink to="/assistant" className={linkClass}>Ask Adam</NavLink>
          <NavLink to="/strategy" className={linkClass}>Strategy</NavLink>
          <NavLink to="/portfolio" className={linkClass}>Portfolio</NavLink>
          <NavLink to="/insights" className={linkClass}>Insights</NavLink>
        </nav>

        <div className="flex items-center gap-1.5 ml-auto">
          <BackupModal />
          <div className="hidden sm:block"><CommandPalette /></div>
          <Link to="/settings" className="h-8 w-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Settings">
            <SettingsIcon className="h-4 w-4" />
          </Link>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
    </header>
    <MobileNav />
    </>
  );
}