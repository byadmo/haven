import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Target, Flame, BookOpen, TrendingUp, ArrowRight, Sparkles, Brain, Trophy, Clock, User } from "lucide-react";
import { useSI } from "@/lib/SIContext";
import { SI_PAGES } from "@/lib/SILayout";
import { StatGridSkeleton } from "@/components/ui/skeleton-presets";
import { useGrowth } from "@/lib/GrowthContext";
import { Button } from "@/components/ui/button";
import PomodoroTimer from "@/components/growth/PomodoroTimer";

export default function SIDashboard() {
  const { habits, entries, reflections, focusSessions, settings, getStreak, getTodayStatus, getWeeklyStats, loaded } = useSI();
  const { totalXp, level, xpInLevel, xpForNext, unlockedThemes } = useGrowth();
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpFlash, setXpFlash] = useState(0);
  const [prevLevel, setPrevLevel] = useState(level);
  const [showPomodoro, setShowPomodoro] = useState(false);

  const todayDone = habits.filter(h => getTodayStatus(h.id)).length;
  const totalHabits = habits.length;
  const todayPct = totalHabits > 0 ? Math.round((todayDone / totalHabits) * 100) : 0;
  const bestStreak = habits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);
  const totalCheckins = entries.length;
  const totalReflections = reflections.length;

  // XP animation on level up
  useEffect(() => {
    if (level > prevLevel) {
      setShowConfetti(true);
      setXpFlash(50);
      setTimeout(() => { setShowConfetti(false); setXpFlash(0); }, 2000);
    }
    setPrevLevel(level);
  }, [level]);

  // Today's focus time
  const todayFocus = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return focusSessions
      .filter(s => (s.created_date || "").slice(0, 10) === today)
      .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  }, [focusSessions]);

  const weeklyStats = useMemo(() => getWeeklyStats(), [getWeeklyStats]);

  // Find next unlock level
  const nextUnlock = useMemo(() => {
    const milestones = [2, 3, 5, 7, 10];
    return milestones.find(m => m > level) || null;
  }, [level]);

  const stats = [
    { label: "Today's Progress", value: `${todayDone}/${totalHabits}`, sub: `${todayPct}% complete`, icon: Target, color: "amber" },
    { label: "Best Streak", value: `${bestStreak}`, sub: bestStreak === 1 ? "day" : "days", icon: Flame, color: "orange" },
    { label: "Total Check-ins", value: `${totalCheckins}`, sub: "all time", icon: TrendingUp, color: "emerald" },
    { label: "Journal Entries", value: `${totalReflections}`, sub: "reflections", icon: BookOpen, color: "blue" },
  ];

  const colorMap = {
      amber: "border-amber-400/30 bg-amber-500/10 text-amber-300",
      orange: "border-orange-400/30 bg-orange-500/10 text-orange-300",
      emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
      blue: "border-blue-400/30 bg-blue-500/10 text-blue-300",
    };

    const staggerVariants = {
      hidden: { opacity: 0, y: 20 },
      show: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
      }),
    };

    const containerVariants = {
      hidden: {},
      show: { transition: { staggerChildren: 0.05 } },
    };

  return (
    <div className="dd-page-enter space-y-6">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-up"
              style={{
                left: `${Math.random() * 100}%`,
                bottom: 0,
                width: 8,
                height: 8,
                borderRadius: Math.random() > 0.5 ? "50%" : 0,
                background: ["#F59E0B", "#00E5A0", "#3B82F6", "#A78BFA", "#FF4D4D"][Math.floor(Math.random() * 5)],
                animation: `float-up ${1.5 + Math.random() * 1.5}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Growth Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Your habits, streaks, and reflections at a glance.</p>
        </div>
        <Button
          onClick={() => setShowPomodoro(true)}
          className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
          variant="outline"
        >
          <Brain className="h-4 w-4 mr-1.5" /> Focus
        </Button>
      </div>

      {/* XP / Level bar */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-amber-500/5 to-teal-500/5 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Level {level}</span>
            {xpFlash > 0 && <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />}
          </div>
          <span className="text-xs text-white/50">{totalXp} total XP</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-teal-400 transition-all duration-700"
            style={{ width: `${(xpInLevel / Math.max(xpForNext, 1)) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-white/30">{xpInLevel} / {xpForNext} XP to next level</p>
          {nextUnlock && (
            <p className="text-[10px] text-amber-400/60 flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Unlock at Level {nextUnlock}
            </p>
          )}
        </div>
      </div>

            {/* Identity goal banner */}
            {loaded && (settings.identity_goal || settings.primary_focus_goal) && (
              <div className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-3 sm:p-4 flex items-center gap-3">
                <div className="grid place-items-center rounded-lg border border-amber-400/20 bg-amber-500/10 h-8 w-8 shrink-0">
                  <User className="h-4 w-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-amber-300/60 uppercase tracking-wider font-medium">Becoming</p>
                  <p className="text-sm text-white/90 truncate">
                    {settings.identity_goal || settings.primary_focus_goal}
                  </p>
                </div>
              </div>
            )}

            {/* Stats grid — skeleton while loading */}
      {!loaded ? (
        <StatGridSkeleton count={4} />
      ) : (
        <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="haven-fade-in grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
                >
                  {stats.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <motion.div
                        key={s.label}
                        layoutId={`stat-${s.label}`}
                        variants={staggerVariants}
                        custom={i}
                        className="rounded-2xl border border-white/10 bg-black p-4 sm:p-5 transition-all duration-200 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] cursor-default"
                      >
                        <div className={`inline-flex items-center justify-center rounded-lg border h-9 w-9 mb-3 ${colorMap[s.color]}`}>
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">{s.value}</p>
                        <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
                      </motion.div>
                    );
                  })}
                </motion.div>
      )}

      {/* Weekly Summary */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-amber-400" /> Weekly Summary
          </h2>
          <span className="text-[10px] text-white/30">This week</span>
        </div>
        <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                  <motion.div variants={staggerVariants} custom={0}>
            <p className="text-2xl font-semibold text-white">{weeklyStats.thisWeekPct}%</p>
            <p className="text-[10px] text-white/40">Completion rate</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[10px] ${weeklyStats.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {weeklyStats.change >= 0 ? "+" : ""}{weeklyStats.change}%
              </span>
              <span className="text-[10px] text-white/20">vs last week</span>
            </div>
          </motion.div>
                    <motion.div variants={staggerVariants} custom={1}>
                      <p className="text-2xl font-semibold text-white">{weeklyStats.thisWeekDone}</p>
                      <p className="text-[10px] text-white/40">Check-ins</p>
                    </motion.div>
                    <motion.div variants={staggerVariants} custom={2}>
                      <p className="text-2xl font-semibold text-white">{weeklyStats.thisWeekReflections}</p>
                      <p className="text-[10px] text-white/40">Journal entries</p>
                    </motion.div>
                    <motion.div variants={staggerVariants} custom={3}>
                      <p className="text-2xl font-semibold text-white">{todayFocus > 0 ? `${todayFocus}m` : "0m"}</p>
                      <p className="text-[10px] text-white/40">Focus today</p>
                    </motion.div>
                  </motion.div>
        {/* Mini progress bar */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-teal-400 transition-all"
            style={{ width: `${weeklyStats.thisWeekPct}%` }}
          />
        </div>
      </div>

      {/* Today's habits quick view */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Today's Habits</h2>
          <Link to="/growth/habits" className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1">
            Manage <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {habits.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No habits yet. Add your first habit to start building streaks.</p>
            <Link to="/growth/habits" className="inline-flex items-center gap-1.5 mt-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
              <Target className="h-3.5 w-3.5" /> Create Habit
            </Link>
          </div>
        ) : (
          <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                      {habits.slice(0, 5).map((h, hi) => {
                        const done = getTodayStatus(h.id);
                        const streak = getStreak(h.id);
                        const habitColor = h.color || "amber";
                        return (
                          <motion.div
                            key={h.id}
                            variants={staggerVariants}
                            custom={hi}
                            className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2.5 hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200"
                          >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      { amber: "bg-amber-400", emerald: "bg-emerald-400", blue: "bg-blue-400", purple: "bg-purple-400", rose: "bg-rose-400", cyan: "bg-cyan-400" }[habitColor] || "bg-amber-400"
                    }`} />
                    <span className={`text-sm ${done ? "text-white" : "text-white/60"}`}>{h.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {streak > 0 && (
                      <span className="flex items-center gap-1 text-xs text-orange-300">
                        <Flame className="h-3 w-3" /> {streak}
                      </span>
                    )}
                    <span className={`text-xs ${done ? "text-amber-300" : "text-white/30"}`}>{done ? "Done" : "Pending"}</span>
                  </div>
                </motion.div>
                              );
                            })}
                          </motion.div>
        )}
      </div>

            {/* Today's Focus */}
            {loaded && (
              <div className="rounded-2xl border border-white/10 bg-black p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Brain className="h-4 w-4 text-amber-400" /> Today's Focus
                  </h2>
                  <Button
                    onClick={() => setShowPomodoro(true)}
                    variant="outline"
                    className="border-amber-400/20 bg-amber-500/5 text-amber-300 hover:bg-amber-500/15 h-7 text-[10px] px-2.5 rounded-lg"
                  >
                    <Clock className="h-3 w-3 mr-1" /> Start Session
                  </Button>
                </div>
                <motion.div
                                  variants={containerVariants}
                                  initial="hidden"
                                  animate="show"
                                  className="grid grid-cols-3 gap-3"
                                >
                                  <motion.div variants={staggerVariants} custom={0}>
                                    <p className="text-xl font-semibold text-white">
                                      {focusSessions.filter(s => (s.created_date || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
                                    </p>
                                    <p className="text-[10px] text-white/40">sessions</p>
                                  </motion.div>
                                  <motion.div variants={staggerVariants} custom={1}>
                                    <p className="text-xl font-semibold text-white">{todayFocus > 0 ? `${todayFocus}m` : "0m"}</p>
                                    <p className="text-[10px] text-white/40">minutes</p>
                                  </motion.div>
                                  <motion.div variants={staggerVariants} custom={2}>
                                    <p className="text-xl font-semibold text-white">
                                      {Math.floor(todayFocus / 25)}
                                    </p>
                                    <p className="text-[10px] text-white/40">XP earned</p>
                                  </motion.div>
                                </motion.div>
              </div>
            )}

            {/* Quick links */}
      <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-4 gap-3"
              >
              {SI_PAGES.slice(1).filter(p => p.id !== "settings").map((p, pi) => {
                const Icon = p.icon;
                return (
                  <motion.div key={p.id} variants={staggerVariants} custom={pi}>
                  <Link
                    to={p.to}
                    className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black p-4 hover:border-amber-400/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    <div className="inline-flex items-center justify-center rounded-lg border border-amber-400/20 bg-amber-500/5 h-9 w-9">
                      <Icon className="h-4 w-4 text-amber-300" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.label}</p>
                      <p className="text-xs text-white/40">View {p.label.toLowerCase()}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-amber-300 ml-auto transition-colors" />
                  </Link>
                  </motion.div>
                );
              })}
            </motion.div>

      {/* Pomodoro */}
      <PomodoroTimer open={showPomodoro} onOpenChange={setShowPomodoro} />
    </div>
  );
}