import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Target, Flame, BookOpen, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSI } from "@/lib/SIContext";
import { useGrowth } from "@/lib/GrowthContext";

const REVIEW_KEY = "haven_growth_last_weekly_review";

export default function WeeklyReviewModal() {
  const { habits, entries, reflections, getWeeklyStats, getStreak } = useSI();
  const { totalXp, level } = useGrowth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if it's Monday morning and we haven't shown the review yet
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const lastShown = localStorage.getItem(REVIEW_KEY);
    const today = now.toISOString().slice(0, 10);

    if (day === 1 && hour < 14 && lastShown !== today) {
      // Only show if user has some data
      if (habits.length > 0 || entries.length > 0) {
        setOpen(true);
        localStorage.setItem(REVIEW_KEY, today);
      }
    }
  }, [habits, entries]);

  const stats = getWeeklyStats();

  const bestStreak = habits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0);
  const thisWeekReflections = reflections.filter(r => {
    const d = new Date(r.date || r.created_date);
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    return d >= monday;
  }).length;

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(REVIEW_KEY, new Date().toISOString().slice(0, 10));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <AnimatePresence>
        {open && (
          <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-md">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  Weekly Review
                </DialogTitle>
                <button onClick={handleClose} className="text-white/30 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <DialogDescription className="text-white/40">
                Here's how your week went
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] text-white/40">Completion</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{stats.thisWeekPct}%</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[10px] ${stats.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {stats.change >= 0 ? "↑" : "↓"} {Math.abs(stats.change)}%
                    </span>
                    <span className="text-[10px] text-white/20">vs last week</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-[10px] text-white/40">Best Streak</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{bestStreak}d</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[10px] text-white/40">Journal</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{thisWeekReflections}</p>
                  <p className="text-[10px] text-white/30">entries this week</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] text-white/40">Level</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{level}</p>
                  <p className="text-[10px] text-white/30">{totalXp} total XP</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="rounded-xl border border-white/10 bg-black p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/70">Weekly completion</span>
                  <span className="text-xs font-semibold text-white">{stats.thisWeekDone}/{stats.totalPossible} check-ins</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-teal-400 transition-all"
                    style={{ width: `${stats.thisWeekPct}%` }}
                  />
                </div>
              </div>

              {/* Encouragement */}
              <div className="text-center py-2">
                <p className="text-sm text-white/60">
                  {stats.thisWeekPct >= 80
                    ? "🔥 Amazing week! You're building serious momentum."
                    : stats.thisWeekPct >= 50
                      ? "👍 Solid week. Keep showing up — consistency beats intensity."
                      : "💪 Every week is a fresh start. You've got this."
                    }
                </p>
              </div>
            </div>

            <Button
              onClick={handleClose}
              className="w-full bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30"
            >
              <Sparkles className="h-4 w-4 mr-1.5" /> Let's Go!
            </Button>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}