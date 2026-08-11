import React, { useMemo } from "react";
import { Flame, Trophy, TrendingUp, CalendarDays } from "lucide-react";
import { useSI } from "@/lib/SIContext";

const MILESTONES = [7, 14, 30, 60, 90, 180, 365];

export default function StreaksPage() {
  const { habits, entries, getStreak } = useSI();

  const sorted = [...habits].sort((a, b) => getStreak(b.id) - getStreak(a.id));

  // Streak history — last 30 days of each habit's streak tracking
  const streakHistory = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const done = entries.filter(e => e.date === key).length;
      days.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }).charAt(0),
        date: key,
        done,
        pct: habits.length > 0 ? done / habits.length : 0,
      });
    }
    return days;
  }, [entries, habits]);

  // Predictions
  const predictions = useMemo(() => {
    if (sorted.length === 0 || getStreak(sorted[0].id) === 0) return null;
    const top = sorted[0];
    const streak = getStreak(top.id);
    const nextMilestone = MILESTONES.find(m => m > streak) || 365;
    const daysToGo = nextMilestone - streak;
    return { habit: top.name, current: streak, next: nextMilestone, daysToGo };
  }, [sorted, getStreak]);

  // This month vs last month
  const monthlyCompare = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const thisYear = now.getFullYear();
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const thisMonthEntries = entries.filter(e => {
      const d = new Date(e.date + "T00:00:00");
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const lastMonthEntries = entries.filter(e => {
      const d = new Date(e.date + "T00:00:00");
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    });

    const thisDays = new Date(thisYear, thisMonth + 1, 0).getDate();
    const lastDays = new Date(lastYear, lastMonth + 1, 0).getDate();
    const thisPossible = habits.length * thisDays;
    const lastPossible = habits.length * lastDays;

    return {
      thisPct: thisPossible > 0 ? Math.round((thisMonthEntries.length / thisPossible) * 100) : 0,
      lastPct: lastPossible > 0 ? Math.round((lastMonthEntries.length / lastPossible) * 100) : 0,
    };
  }, [entries, habits]);

  const heatColor = (pct) => {
    if (pct === 0) return "bg-white/5";
    if (pct < 0.34) return "bg-amber-500/25";
    if (pct < 0.67) return "bg-amber-500/50";
    if (pct < 1) return "bg-amber-500/75";
    return "bg-amber-400";
  };

  return (
    <div className="dd-page-enter space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Streaks</h1>
        <p className="text-sm text-white/50 mt-1">Consistency is the compound interest of self-improvement.</p>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/10 bg-black">
          <Flame className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">No streaks to track yet. Add habits first.</p>
        </div>
      ) : (
        <>
          {/* Monthly comparison + Prediction row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Monthly compare */}
            <div className="rounded-2xl border border-white/10 bg-black p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Monthly Comparison</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/40">Last month</span>
                    <span className="text-xs text-white/60">{monthlyCompare.lastPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-white/30 transition-all" style={{ width: `${monthlyCompare.lastPct}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-white/40">This month</span>
                    <span className="text-xs text-white/60">{monthlyCompare.thisPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-teal-400 transition-all" style={{ width: `${monthlyCompare.thisPct}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-2">
                {monthlyCompare.thisPct >= monthlyCompare.lastPct ? "📈 Improving" : "📉 Down"} vs last month
              </p>
            </div>

            {/* Prediction */}
            {predictions && (
              <div className="rounded-2xl border border-white/10 bg-black p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-white">Next Milestone</h2>
                </div>
                <p className="text-sm text-white/70">
                  "{predictions.habit}" — {predictions.current} days
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {predictions.daysToGo} more days to reach {predictions.next}-day milestone
                </p>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                    style={{ width: `${(predictions.current / predictions.next) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 30-day streak history heatmap */}
          <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-4 w-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-white">30-Day Streak History</h2>
            </div>
            <div className="flex gap-1.5">
              {streakHistory.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full h-8 rounded-sm ${heatColor(d.pct)} transition-colors`}
                    title={`${d.date}: ${d.done}/${habits.length} habits`}
                  />
                  {i % 5 === 0 && (
                    <span className="text-[8px] text-white/30">{d.label}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-end mt-3">
              <span className="text-[10px] text-white/30">Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-white/5" />
                <div className="w-3 h-3 rounded-sm bg-amber-500/25" />
                <div className="w-3 h-3 rounded-sm bg-amber-500/50" />
                <div className="w-3 h-3 rounded-sm bg-amber-500/75" />
                <div className="w-3 h-3 rounded-sm bg-amber-400" />
              </div>
              <span className="text-[10px] text-white/30">More</span>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="space-y-2">
            {sorted.map((h, i) => {
              const streak = getStreak(h.id);
              const medals = ["🥇", "🥈", "🥉"];
              const nextMilestone = MILESTONES.find(m => m > streak) || 365;
              const prev = MILESTONES.filter(m => m <= streak).pop() || 0;
              const pct = streak > 0 ? Math.round(((streak - prev) / (nextMilestone - prev)) * 100) : 0;

              return (
                <div
                  key={h.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-black p-4"
                >
                  <div className="w-8 text-center">
                    {i < 3 && streak > 0 ? (
                      <span className="text-lg">{medals[i]}</span>
                    ) : (
                      <span className="text-xs text-white/30 font-mono">#{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{h.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {streak >= 3 && <Flame className="h-3 w-3 text-orange-400" />}
                      <span className={`text-xs ${streak > 0 ? "text-orange-300" : "text-white/30"}`}>
                        {streak > 0 ? `${streak} day streak` : "No active streak"}
                      </span>
                    </div>
                    {/* Mini milestone bar */}
                    {streak > 0 && (
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden mt-1.5 max-w-[120px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500/50 to-amber-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Streak bar visualization */}
                  <div className="flex items-end gap-0.5 h-8">
                    {Array.from({ length: Math.min(streak, 14) }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-1.5 rounded-t-sm bg-gradient-to-t from-orange-500/40 to-amber-400/80"
                        style={{ height: `${20 + (idx / 14) * 80}%` }}
                      />
                    ))}
                    {streak === 0 && (
                      <span className="text-xs text-white/20 self-center">—</span>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-semibold text-white">{streak}</p>
                    <p className="text-[10px] text-white/30">days</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Milestone badges */}
          {sorted[0] && getStreak(sorted[0].id) > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Milestone Progress</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {MILESTONES.map(ms => {
                  const reached = sorted.some(h => getStreak(h.id) >= ms);
                  return (
                    <div
                      key={ms}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                        reached
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                          : "border-white/10 bg-black text-white/30"
                      }`}
                    >
                      <span className="text-sm">{reached ? "🏆" : "🔒"}</span>
                      <span className="font-medium">{ms} days</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}