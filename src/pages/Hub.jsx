import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Wallet, GraduationCap, ArrowRight } from "lucide-react";
import ThemeRoot from "@/components/ThemeRoot";
import { getStoredTheme } from "@/lib/themes";

const CARDS = [
  {
    to: "/overview",
    title: "Haven Financial",
    desc: "Net worth, debts, cash flow, budgets & forecasts.",
    icon: Wallet,
    ring: "group-hover:border-indigo-400/50",
    iconWrap: "border-indigo-400/30 bg-indigo-500/10",
    iconColor: "text-indigo-300",
    glow: "from-indigo-500/15",
    label: "Open",
  },
  {
    to: "/education",
    title: "Haven Education",
    desc: "Courses, focus timer, grades & analytics.",
    icon: GraduationCap,
    ring: "group-hover:border-emerald-400/50",
    iconWrap: "border-emerald-400/30 bg-emerald-500/10",
    iconColor: "text-emerald-300",
    glow: "from-emerald-500/15",
    label: "Open",
  },
];

export default function Hub() {
  const navigate = useNavigate();
  const theme = React.useMemo(() => getStoredTheme("finance"), []);

  return (
    <ThemeRoot theme={theme} app="finance" className="dd-page-enter dark min-h-screen overflow-hidden">
      <div className="min-h-screen selection:bg-white/20 relative">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <main className="relative max-w-5xl mx-auto px-5 sm:px-8 min-h-screen flex flex-col">
        {/* Header / logo */}
        <header className="flex items-center justify-between py-6 sm:py-8">
          <div className="flex items-center gap-2.5 splash-logo-in">
            <div className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5" style={{ height: 32, width: 32 }}>
              <ShieldCheck className="text-white/80" style={{ height: 18, width: 18 }} />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">Haven</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/30 hidden sm:inline">Choose your workspace</span>
        </header>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 sm:mb-12"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-2">Welcome back</p>
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
              Choose your Haven
            </h1>
            <p className="text-sm text-white/50 mt-2 max-w-md leading-relaxed">
              Select a workspace to continue. Your finance dashboard is ready; education is on the way.
            </p>
          </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {CARDS.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.button
                  key={c.to}
                  type="button"
                  onClick={() => navigate(c.to)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group relative text-left rounded-2xl border border-white/10 bg-black p-6 sm:p-8 transition-colors ${c.ring} overflow-hidden`}
                >
                  <div className={`pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-gradient-to-br ${c.glow} to-transparent blur-2xl opacity-70`} />
                  <div className={`relative h-12 w-12 grid place-items-center rounded-xl border ${c.iconWrap} mb-5`}>
                    <Icon className={`h-6 w-6 ${c.iconColor}`} strokeWidth={1.75} />
                  </div>
                  <h2 className="relative text-lg sm:text-xl font-semibold tracking-tight text-white">{c.title}</h2>
                  <p className="relative text-xs sm:text-sm text-white/50 mt-1.5 leading-relaxed">{c.desc}</p>
                  <div className="relative mt-6 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                    {c.label}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <footer className="py-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Haven · One workspace, many paths</p>
        </footer>
      </main>
      </div>
    </ThemeRoot>
  );
}