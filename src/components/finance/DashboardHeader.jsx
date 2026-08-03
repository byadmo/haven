import React from "react";
import { Link, NavLink } from "react-router-dom";
import { Wallet } from "lucide-react";
import { format } from "date-fns";

export default function DashboardHeader({ actions }) {
  const now = new Date();
  const linkClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      isActive ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
    }`;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-zinc-950/70 border-b border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-50 leading-none">Debt Free</h1>
              <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">{format(now, "EEEE, MMM d")}</p>
            </div>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            <NavLink to="/" className={linkClass} end>Overview</NavLink>
            <NavLink to="/strategy" className={linkClass}>Strategy</NavLink>
            <NavLink to="/portfolio" className={linkClass}>Portfolio</NavLink>
          </nav>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </header>
  );
}