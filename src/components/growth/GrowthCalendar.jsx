import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { useSI } from "@/lib/SIContext";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay(); // 0=Sun
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export default function GrowthCalendar() {
  const { habits, entries, getTodayStatus } = useSI();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const days = useMemo(() => getMonthGrid(year, month), [year, month]);

  const monthLabel = `${MONTHS[month]} ${year}`;

  const getEntriesForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return entries.filter((e) => e.date === dateStr);
  };

  const prevMonth = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); };

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Habit Calendar</h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs font-medium text-white/80 w-24 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-white/30 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;

          const dayEntries = getEntriesForDay(day);
          const done = dayEntries.length;
          const total = habits.length;
          const pct = total > 0 ? done / total : 0;

          const cellBg = pct === 0 ? "bg-white/5" : pct >= 1 ? "bg-amber-400/30" : "bg-amber-400/15";
          const isActive = isToday(day);

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${cellBg} ${isActive ? "ring-1 ring-amber-400/50" : ""}`}
              title={`${year}-${month + 1}-${day}: ${done}/${total} habits`}
            >
              <span className={`font-medium ${isActive ? "text-amber-300" : done > 0 ? "text-white/80" : "text-white/40"}`}>
                {day}
              </span>
              {total > 0 && (
                <span className="text-[8px] mt-0.5 flex items-center gap-0.5">
                  {done >= total ? (
                    <Check className="h-2.5 w-2.5 text-amber-400" />
                  ) : done > 0 ? (
                    <span className="text-amber-400/70">{done}</span>
                  ) : (
                    <X className="h-2.5 w-2.5 text-white/20" />
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-white/5" />
          <span className="text-[10px] text-white/30">Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-400/15" />
          <span className="text-[10px] text-white/30">Partial</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-400/30" />
          <span className="text-[10px] text-white/30">Complete</span>
        </div>
      </div>
    </div>
  );
}