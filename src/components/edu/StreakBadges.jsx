import React from "react";
import { Flame, Medal, Clock, CalendarCheck } from "lucide-react";

export default function StreakBadges({ current, longest, totalHours }) {
  const BADGES = [
    { id: "7", label: "7-Day", icon: Flame, unlocked: current >= 7 || longest >= 7, color: "text-amber-300 border-amber-400/40 bg-amber-500/10" },
    { id: "30", label: "30-Day", icon: Medal, unlocked: longest >= 30, color: "text-emerald-300 border-emerald-400/40 bg-emerald-500/10" },
    { id: "100h", label: "100 Hours", icon: Clock, unlocked: totalHours >= 100, color: "text-sky-300 border-sky-400/40 bg-sky-500/10" },
    { id: "1d", label: "First Day", icon: CalendarCheck, unlocked: current >= 1 || longest >= 1, color: "text-violet-300 border-violet-400/40 bg-violet-500/10" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {BADGES.map((b) => {
        const Icon = b.icon;
        return (
          <div
            key={b.id}
            className={`rounded-lg border p-3 text-center transition-opacity ${b.color} ${b.unlocked ? "" : "opacity-25 grayscale"}`}
          >
            <Icon className="h-5 w-5 mx-auto mb-1" />
            <p className="text-[10px] uppercase tracking-widest">{b.label}</p>
          </div>
        );
      })}
    </div>
  );
}