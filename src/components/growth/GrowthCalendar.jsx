import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, CalendarDays, List, Grid3x3 } from "lucide-react";
import { useSI } from "@/lib/SIContext";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export default function GrowthCalendar() {
  const { habits, entries, reflections, getTodayStatus } = useSI();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState("month");
  const [selectedDay, setSelectedDay] = useState(null);

  const days = useMemo(() => getMonthGrid(year, month), [year, month]);
  const monthLabel = `${MONTHS[month]} ${year}`;

  const getEntriesForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return entries.filter((e) => e.date === dateStr);
  };

  const getReflectionsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return reflections.filter(r => {
      const d = (r.date || r.created_date || "").slice(0, 10);
      return d === dateStr;
    });
  };

  const prevMonth = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); };

  const isToday = (day) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const habitColorMap = {
    amber: "bg-amber-400",
    emerald: "bg-emerald-400",
    blue: "bg-blue-400",
    purple: "bg-purple-400",
    rose: "bg-rose-400",
    cyan: "bg-cyan-400",
  };

  return (
    <div className="dd-page-enter space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="h-8 w-8 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-white/80 w-28 text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="h-8 w-8 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); }}
            className="text-[10px] text-amber-300 hover:text-amber-200 ml-1"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1 border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("month")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "month" ? "bg-amber-500/10 text-amber-300" : "text-white/40 hover:text-white"}`}
          >
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-amber-500/10 text-amber-300" : "text-white/40 hover:text-white"}`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {viewMode === "month" ? (
        <>
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
              const dayReflections = getReflectionsForDay(day);

              const cellBg = pct === 0 ? "bg-white/5" : pct >= 1 ? "bg-amber-400/30" : "bg-amber-400/15";
              const isActive = isToday(day);
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all cursor-pointer ${cellBg} ${isActive ? "ring-1 ring-amber-400/50" : ""} ${isSelected ? "ring-2 ring-amber-400" : ""} hover:ring-1 hover:ring-white/30`}
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
                  {dayReflections.length > 0 && (
                    <span className="text-[7px] text-blue-300/60 mt-0.5">📝</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day detail popover */}
          {selectedDay && (
            <div className="rounded-2xl border border-white/10 bg-black p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  {MONTHS[month]} {selectedDay}, {year}
                </h3>
                <button onClick={() => setSelectedDay(null)} className="text-[10px] text-white/30 hover:text-white">Close</button>
              </div>
              {habits.length === 0 ? (
                <p className="text-xs text-white/30">No habits to display.</p>
              ) : (
                <div className="space-y-1.5">
                  {habits.map(h => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
                    const done = entries.some(e => e.focus_id === h.id && e.date === dateStr);
                    const hColor = h.color || "amber";
                    return (
                      <div key={h.id} className="flex items-center gap-2.5">
                        <div className={`h-2 w-2 rounded-full ${habitColorMap[hColor] || "bg-amber-400"}`} />
                        <span className={`text-xs flex-1 ${done ? "text-white" : "text-white/40"}`}>{h.name}</span>
                        <span className={`text-[10px] ${done ? "text-amber-300" : "text-white/20"}`}>{done ? "✅ Done" : "⬜ Missed"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Reflections on this day */}
              {(() => {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
                const dayReflections = reflections.filter(r => {
                  const d = (r.date || r.created_date || "").slice(0, 10);
                  return d === dateStr;
                });
                if (dayReflections.length === 0) return null;
                return (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-[10px] text-white/40 mb-2">Journal entries</p>
                    {dayReflections.map(r => (
                      <div key={r.id} className="text-xs text-white/60 mb-1">
                        <span className="text-white/80">{r.title}</span> — {r.body?.slice(0, 80)}...
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-end gap-3 mt-2">
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
        </>
      ) : (
        /* List view */
        <div className="rounded-2xl border border-white/10 bg-black p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-400" /> Recent Activity
          </h2>
          {entries.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8">No check-ins recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {[...entries].reverse().slice(-30).map(e => {
                const h = habits.find(x => x.id === e.focus_id);
                return (
                  <div key={e.id} className="flex items-center gap-2 text-xs text-white/60">
                    <span className="text-white/30 w-24">{e.date}</span>
                    <span className="text-white/80">{h?.name || "Unknown habit"}</span>
                    <span className="text-amber-300/60 ml-auto">✅</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}