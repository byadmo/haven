import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Wallet } from "lucide-react";
import { format } from "date-fns";
import CommandPalette from "@/components/finance/CommandPalette";
import BackupModal from "@/components/finance/BackupModal";

export default function DashboardHeader({ actions }) {
  const now = new Date();
  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 text-xs font-mono uppercase tracking-widest transition-colors duration-150 ${
      isActive ? "text-emerald-400 border-b-2 border-emerald-400" : "text-white/50 hover:text-white border-b-2 border-transparent"
    }`;

  return (
    <header className="sticky top-0 z-30 bg-black border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 flex items-center justify-center bg-emerald-500 text-black">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-50 leading-none font-mono">DEBT FREE</h1>
              <p className="text-[10px] uppercase tracking-widest text-white/50 mt-0.5 hidden sm:block font-mono">{format(now, "EEEE · MMM d").toUpperCase()}</p>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            <NavLink to="/" className={linkClass} end>Overview</NavLink>
            <NavLink to="/strategy" className={linkClass}>Strategy</NavLink>
            <NavLink to="/portfolio" className={linkClass}>Portfolio</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <CommandPalette />
          <BackupModal />
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>
    </header>
  );
}