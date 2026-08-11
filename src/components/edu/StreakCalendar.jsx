import React, { useMemo, useState } from "react";
import { Flame, TrendingUp } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAYS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];
const TOTAL_DAYS = 84; // 12 weeks

/** Format a Date as a local YYYY-MM-DD key. */
function localKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format a Date as a friendly display string. */
function friendlyDate(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Map study minutes to an emerald opacity-based colour class.
 * - 0 minutes → bg-white/5 (barely visible)
 * - up to maxMinutes → scales from bg-emerald-900 via emerald-700 to emerald-500
 */
function cellClasses(minutes, maxMinutes) {
  if (!minutes || minutes <= 0) return "bg-white/5";

  const ratio = maxMinutes > 0 ? minutes / maxMinutes : 0;

  // Four tiers of intensity based on ratio
  if (ratio <= 0.25) return "bg-emerald-900/70";
  if (ratio <= 0.5) return "bg-emerald-700/80";
  if (ratio <= 0.75) return "bg-emerald-600/85";
  return "bg-emerald-500/90";
}

/* ------------------------------------------------------------------ */
/*  StreakCalendar                                                     */
/* ------------------------------------------------------------------ */

export default function StreakCalendar({ studySessions = [], streak = {} }) {
  const { current = 0, longest = 0 } = streak;

  // ---- derive the grid data -------------------------------------------
  const { days, maxMinutes } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build lookup: accumulated minutes per date key
    const byDate = {};
    (studySessions || []).forEach((s) => {
      const d = new Date(s.completed_at);
      const k = localKey(d);
      byDate[k] = (byDate[k] || 0) + (s.duration_minutes || 0);
    });

    // Walk backward 84 days, starting from today
    const result = [];
    let maxMins = 0;

    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const k = localKey(date);
      const mins = byDate[k] || 0;
      if (mins > maxMins) maxMins = mins;
      result.push({
        key: k,
        date: new Date(date),
        minutes: mins,
        isToday: k === localKey(today),
      });
    }

    return { days: result, maxMinutes: maxMins };
  }, [studySessions]);

  // Group into 12 columns of 7 rows (Mon-Sun).
  // days[0] is the earliest day in the range, days[83] is today.
  const weeks = useMemo(() => {
    const cols = [];
    for (let w = 0; w < 12; w++) {
      const col = [];
      // Monday = 1, Sunday = 0 in getDay()
      // We want each column to hold Mon..Sun in rows 0..6.
      for (let row = 0; row < 7; row++) {
        // The grid is built so that the first column starts
        // on the Monday of the week containing the earliest date.
        const idx = w * 7 + row;
        if (idx < days.length) {
          col.push(days[idx]);
        } else {
          col.push(null);
        }
      }
      cols.push(col);
    }
    return cols;
  }, [days]);

  // ---- tooltip state ---------------------------------------------------
  const [tooltip, setTooltip] = useState(null);

  // ---- render ----------------------------------------------------------
  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/90 tracking-tight">
          Study Streak Calendar
        </h3>
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-white/80 font-medium">{current}</span>
            <span className="hidden sm:inline">day{current !== 1 ? "s" : ""}</span>
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-white/80 font-medium">{longest}</span>
            <span className="hidden sm:inline">best</span>
          </span>
        </div>
      </div>

      {/* ---- Calendar grid ------------------------------------------- */}
      <div className="flex gap-[2px]">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-[2px] mr-1">
          {DAYS_SHORT.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-end pr-1.5 text-[9px] leading-none text-white/30 h-[12px]"
              style={{ width: 14 }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 12 week columns */}
        <div className="flex gap-[2px] flex-1">
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {col.map((day, ri) => {
                if (!day) {
                  return (
                    <div
                      key={`${wi}-${ri}`}
                      className="w-[12px] h-[12px]"
                    />
                  );
                }
                const mins = day.minutes;
                const classes = cellClasses(mins, maxMinutes);

                return (
                  <div
                    key={day.key}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        date: day.date,
                        minutes: mins,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 4,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    className={`w-[12px] h-[12px] rounded-sm cursor-pointer transition-colors duration-150 ${classes} ${
                      day.isToday
                        ? "ring-1 ring-emerald-300/70 ring-offset-[1px] ring-offset-[#0a0a0f]"
                        : ""
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Legend -------------------------------------------------- */}
      <div className="flex items-center justify-end gap-1.5 mt-2">
        <span className="text-[10px] text-white/40">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((tier) => {
          let cls;
          if (tier === 0) cls = "bg-white/5";
          else if (tier <= 0.25) cls = "bg-emerald-900/70";
          else if (tier <= 0.5) cls = "bg-emerald-700/80";
          else if (tier <= 0.75) cls = "bg-emerald-600/85";
          else cls = "bg-emerald-500/90";
          return (
            <div
              key={tier}
              className={`w-[10px] h-[10px] rounded-sm ${cls}`}
            />
          );
        })}
        <span className="text-[10px] text-white/40">More</span>
      </div>

      {/* ---- Tooltip ------------------------------------------------- */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-2 py-1 rounded-md bg-[#1a1a2e] border border-white/10 shadow-lg text-xs text-white/90 whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium">{friendlyDate(tooltip.date)}</p>
          <p className="text-emerald-400 text-[11px]">
            {tooltip.minutes > 0
              ? `${tooltip.minutes} min${tooltip.minutes !== 1 ? "s" : ""}`
              : "No activity"}
          </p>
        </div>
      )}
    </div>
  );
}