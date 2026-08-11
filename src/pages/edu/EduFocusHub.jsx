import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Timer, CalendarDays } from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { useNavigate } from "react-router-dom";
import ScheduleTaskModal from "@/components/edu/ScheduleTaskModal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM - 7 PM

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

function localKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EduFocusHub() {
  const { courses, deliverables } = useEduSync();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [taskModal, setTaskModal] = useState(null); // null | { date } | { deliverable }

  const courseById = useMemo(() => Object.fromEntries((courses || []).map((c) => [c.id, c])), [courses]);

  const weekDates = useMemo(() => {
    return DAYS.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // ── Schedule Items ──
  const scheduleItems = useMemo(() => {
    const items = [];
    for (const c of courses || []) {
      if (c.schedule && c.schedule.length) {
        for (const s of c.schedule) {
          const dayIdx = DAYS.indexOf(s.day);
          if (dayIdx >= 0) {
            items.push({
              id: `${c.id}-${s.day}-${s.start}`,
              type: "class",
              title: c.name,
              subtitle: c.professor || c.location || "",
              day: dayIdx,
              start: parseInt(s.start),
              end: parseInt(s.end),
              courseId: c.id,
              color: "indigo",
            });
          }
        }
      }
    }
    for (const t of deliverables || []) {
      if (t.due_date && t.due_time) {
        const due = new Date(t.due_date + "T" + (t.due_time || "09:00"));
        const dayDiff = Math.round((due - weekStart) / (24 * 60 * 60 * 1000));
        if (dayDiff >= 0 && dayDiff < 7) {
          const c = courseById[t.course_id];
          items.push({
            id: `task-${t.id}`,
            type: "task",
            deliverableId: t.id,
            title: t.title || t.name,
            subtitle: c?.code || "",
            day: dayDiff,
            start: parseInt(t.due_time?.split(":")[0] || "9"),
            end: parseInt(t.due_time?.split(":")[0] || "9") + 1,
            courseId: t.course_id,
            completed: t.completed,
            color: t.completed ? "emerald" : "amber",
          });
        }
      }
    }
    return items.sort((a, b) => a.start - b.start);
  }, [courses, deliverables, weekStart, courseById]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => setWeekStart(getWeekStart());

  return (
    <div className="dd-page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Focus Hub</h1>
          <p className="text-sm text-white/50 mt-1">Schedule, classes, and study sessions — all in one view.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/education/timer", { viewTransition: true })}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition-colors">
            <Timer className="h-3.5 w-3.5" /> Focus Timer
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-white">
            {weekDates[0]?.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} – {weekDates[6]?.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button onClick={nextWeek} className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={goToday}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors">
          <CalendarDays className="h-3.5 w-3.5" /> Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-white/10 bg-black overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/10">
          <div className="p-2" />
          {DAYS.map((d, i) => {
            const isToday = weekDates[i]?.toDateString() === new Date().toDateString();
            return (
              <div key={d} className={`p-2 text-center ${isToday ? "bg-indigo-500/10" : ""}`}>
                <p className="text-[10px] font-medium text-white/40 uppercase">{d}</p>
                <p className={`text-sm font-semibold mt-0.5 ${isToday ? "text-indigo-300" : "text-white/70"}`}>{weekDates[i]?.getDate()}</p>
              </div>
            );
          })}
        </div>

        {/* Time Slots */}
        <div className="overflow-y-auto max-h-[600px]">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/5 min-h-[60px]">
              <div className="p-2 text-[10px] text-white/30 flex items-start justify-center pt-3">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
              </div>
              {DAYS.map((_, dayIdx) => {
                const items = scheduleItems.filter((s) => s.day === dayIdx && s.start === hour);
                return (
                  <div
                    key={dayIdx}
                    className="relative border-l border-white/5 p-1 cursor-pointer transition-colors hover:bg-white/[0.02]"
                    onClick={() => {
                      const date = new Date(weekDates[dayIdx]);
                      setTaskModal({ date: localKey(date) });
                    }}
                  >
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-lg px-2 py-1.5 text-[10px] cursor-pointer mb-1 transition-colors ${
                          item.color === "indigo" ? "bg-indigo-500/20 border border-indigo-400/30 text-indigo-200" :
                          item.color === "emerald" ? "bg-emerald-500/20 border border-emerald-400/30 text-emerald-200" :
                          "bg-amber-500/20 border border-amber-400/30 text-amber-200"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.type === "task") {
                            const d = deliverables.find((d) => d.id === item.deliverableId);
                            if (d) setTaskModal({ deliverable: d });
                          }
                        }}
                      >
                        <p className="font-medium truncate">{item.title}</p>
                        {item.subtitle && <p className="text-[8px] opacity-70 truncate">{item.subtitle}</p>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Task Modal */}
      <ScheduleTaskModal
        open={!!taskModal}
        onOpenChange={(o) => { if (!o) setTaskModal(null); }}
        defaultDate={taskModal?.date}
        deliverable={taskModal?.deliverable}
      />
    </div>
  );
}