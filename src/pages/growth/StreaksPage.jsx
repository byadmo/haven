import React from "react";
import { Flame, Trophy } from "lucide-react";
import { useSI } from "@/lib/SIContext";

export default function StreaksPage() {
  const { habits, getStreak } = useSI();

  const sorted = [...habits].sort((a, b) => getStreak(b.id) - getStreak(a.id));

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
          {/* Leaderboard */}
          <div className="space-y-2">
            {sorted.map((h, i) => {
              const streak = getStreak(h.id);
              const medals = ["🥇", "🥈", "🥉"];
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

          {/* Milestone progress */}
          {sorted[0] && getStreak(sorted[0].id) > 0 && (
            <div className="rounded-2xl border border-white/10 bg-black p-5">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">Next Milestone</h2>
              </div>
              {(() => {
                const top = sorted[0];
                const streak = getStreak(top.id);
                const milestones = [7, 14, 30, 60, 90, 180, 365];
                const next = milestones.find(m => m > streak) || 365;
                const prev = milestones.filter(m => m <= streak).pop() || 0;
                const pct = streak > 0 ? Math.round(((streak - prev) / (next - prev)) * 100) : 0;
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/70">{top.name}</span>
                      <span className="text-xs text-white/40">{streak} / {next} days</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-2">
                      {next - streak} more days to reach your {next}-day milestone
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
