import React, { useMemo, useState, useEffect, useCallback } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Loader2, MapPin, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import ScheduleTaskModal from "@/components/edu/ScheduleTaskModal";
import PageTitle from "@/components/finance/PageTitle";
import { Button } from "@/components/ui/button";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";

const FRAMES = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];
const DOW_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DOW_MINI = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const COURSE_COLORS = {
  emerald: "#10b981", sky: "#38bdf8", violet: "#a78bfa", rose: "#fb7185",
  amber: "#f59e0b", cyan: "#22d3ee", lime: "#a3e635", orange: "#fb923c", teal: "#2dd4bf", slate: "#94a3b8",
};
const TASK_COLORS = {
  exam: "#fb7185", midterm: "#fb7185", final: "#fb7185",
  project: "#a78bfa", quiz: "#f59e0b", lab: "#22d3ee",
  assignment: "#10b981", other: "#94a3b8",
};

const HOUR_START = 7, HOUR_END = 22, PX_PER_HOUR = 40;
const DAY_ABBREV = { 0: "Su", 1: "M", 2: "T", 3: "W", 4: "Th", 5: "F", 6: "S" };

function localKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function parseTime(t) { const [h, m] = (t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); }
function minutesFromDateTime(iso) { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); }
function courseHex(c) { return COURSE_COLORS[c?.color] || "#10b981"; }
function taskHex(type) { return TASK_COLORS[type] || "#94a3b8"; }
function prettyDate(d) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }

export default function EduSchedule() {
  const { courses, deliverables, settings, activeSemester, refresh } = useEduSync();
  const { toast } = useToast();
  const connected = !!settings?.google_synced;
  const [frame, setFrame] = useState("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [gcal, setGcal] = useState([]);
  const [loadingGcal, setLoadingGcal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [taskModal, setTaskModal] = useState(null); // null | { date } | { deliverable }

  const openAdd = (date) => setTaskModal({ date: localKey(date) });
  const openEdit = (deliverable) => setTaskModal({ deliverable });

  const range = useMemo(() => {
    const a = new Date(anchor);
    if (frame === "day") return { start: a, end: a };
    if (frame === "week") { const s = startOfWeek(a); const e = new Date(s); e.setDate(s.getDate() + 6); return { start: s, end: e }; }
    if (frame === "month") { const s = new Date(a.getFullYear(), a.getMonth(), 1); const e = new Date(a.getFullYear(), a.getMonth() + 1, 0); return { start: s, end: e }; }
    const s = new Date(a.getFullYear(), 0, 1); const e = new Date(a.getFullYear(), 11, 31); return { start: s, end: e };
  }, [frame, anchor]);

  const fetchGcal = useCallback(async () => {
    if (!connected) { setGcal([]); return; }
    setLoadingGcal(true);
    try {
      const res = await base44.functions.invoke("eduCalendar", {
        action: "fetch_events",
        calendar_id: settings?.calendar_id,
        range_start: localKey(range.start),
        range_end: localKey(range.end),
      });
      const d = res?.data ?? res;
      setGcal((d?.items || []).filter((e) => !e.is_edusync));
    } catch { setGcal([]); }
    finally { setLoadingGcal(false); }
  }, [connected, settings?.calendar_id, range.start, range.end]);

  useEffect(() => { fetchGcal(); }, [fetchGcal]);

  function step(dir) {
    const d = new Date(anchor);
    if (frame === "day") d.setDate(d.getDate() + dir);
    else if (frame === "week") d.setDate(d.getDate() + dir * 7);
    else if (frame === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setAnchor(d);
  }

  // ── Block model ──
  // courses → weekly recurring timed sessions
  function courseBlocksForDate(d) {
    const ab = DAY_ABBREV[d.getDay()];
    const out = [];
    for (const c of courses) {
      const days = c.schedule_days || [];
      if (!days.length || !days.includes(ab)) continue;
      const raw = c.schedule_time;
      if (!raw) continue;
      // schedule_time is one or more parts joined by "·", each optionally
      // day-prefixed: "M 10:00-12:00 · F 08:00-10:00", or a bare "10:00-11:30".
      const parts = String(raw).split("·").map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const tm = part.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (!tm) continue;
        // If this part carries a day prefix (e.g. "M 10:00-12:00", "Th 08:00-10:00"),
        // only render it on that weekday; otherwise it applies to every scheduled day.
        const pm = part.match(/^([A-Za-z]{1,2})\s+\d/);
        if (pm && pm[1].trim() !== ab) continue;
        out.push({
          kind: "course",
          title: `${c.code}`,
          subtitle: c.location || c.title || "",
          color: courseHex(c),
          startMin: parseTime(tm[1]),
          endMin: parseTime(tm[2]),
        });
      }
    }
    return out;
  }
  function gcalBlocksForDate(d) {
    const k = localKey(d);
    return gcal.filter((e) => (e.start || "").slice(0, 10) === k && !e.allDay)
      .map((e) => ({ kind: "gcal", title: e.summary, subtitle: e.location || "", color: "#64748b", startMin: minutesFromDateTime(e.start), endMin: minutesFromDateTime(e.end) }));
  }
  function allDayForDate(d) {
    const k = localKey(d);
    const tasks = deliverables.filter((dl) => (dl.due_date || "") === k).map((dl) => ({ kind: "task", title: dl.title, color: taskHex(dl.type), isExam: ["exam", "midterm", "final"].includes(dl.type), deliverable: dl }));
    const allDayGcal = gcal.filter((e) => (e.start || "").slice(0, 10) === k && e.allDay).map((e) => ({ kind: "gcal-all", title: e.summary, color: "#64748b" }));
    return [...tasks, ...allDayGcal];
  }

  const courseById = useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c])), [courses]);

  async function syncTasks() {
    if (!connected) { toast({ title: "Connect your Google Calendar in Settings to sync tasks" }); return; }
    setSyncing(true);
    try {
      const tasks = deliverables.filter((d) => d.due_date).map((d) => ({
        id: d.id, title: d.title, due_date: d.due_date,
        course_code: courseById[d.course_id]?.code || "",
        type: d.type, weight: d.weight, google_event_id: d.google_event_id || null,
      }));
      const res = await base44.functions.invoke("eduCalendar", { action: "sync_tasks", calendar_id: settings?.calendar_id, tasks });
      const d = res?.data ?? res;
      const maps = d.mappings || [];
      if (maps.length) {
        await base44.entities.Deliverable.bulkUpdate(maps.map((m) => ({ id: m.deliverable_id, google_event_id: m.google_event_id })));
        await refresh?.();
      }
      if ((d.created || 0) + (d.updated || 0) > 0) toast({ title: `${d.created || 0} tasks synced · ${d.updated || 0} updated to Google Calendar` });
      else toast({ title: "All tasks already up to date" });
    } catch (e) {
      toast({ title: "Sync failed", description: e?.message, variant: "destructive" });
    } finally { setSyncing(false); }
  }

  const rangeLabel = useMemo(() => {
    if (frame === "day") return prettyDate(anchor);
    if (frame === "week") { const s = startOfWeek(anchor); const e = new Date(s); e.setDate(s.getDate() + 6); return `${prettyDate(s)} – ${prettyDate(e)}`; }
    if (frame === "month") return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    return `${anchor.getFullYear()}`;
  }, [frame, anchor]);

  return (
    <>
      <EduTopBar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <PageTitle title="Schedule" subtitle={connected ? "Courses, tasks & Google Calendar" : "Courses & tasks · connect Calendar in Settings"} icon={CalendarDays} />
          <div className="flex items-center gap-2">
            <Button onClick={() => openAdd(frame === "day" ? anchor : new Date())} className="bg-emerald-500 text-black hover:bg-emerald-400 h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
            </Button>
            <Button onClick={syncTasks} disabled={syncing} variant="outline" className="border-white/10 text-white/70 hover:bg-white/5 h-8">
              {syncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />} Sync
            </Button>
          </div>
        </div>

        {/* Frame toggle + nav */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 rounded-md border border-white/10 p-0.5">
            {FRAMES.map((f) => (
              <button key={f.key} onClick={() => setFrame(f.key)} className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${frame === f.key ? "bg-emerald-500/15 text-emerald-300" : "text-white/50 hover:text-white"}`}>{f.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => step(-1)} className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-mono tabular-nums text-zinc-200 min-w-[150px] text-center">{rangeLabel}</span>
            <button onClick={() => step(1)} className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30"><ChevronRight className="h-4 w-4" /></button>
            <button onClick={() => setAnchor(new Date())} className="text-[10px] uppercase tracking-widest text-emerald-300 hover:text-emerald-200 ml-1">Today</button>
            {loadingGcal && <Loader2 className="h-3.5 w-3.5 text-white/40 ml-1 animate-spin" />}
          </div>
        </div>

        {/* DAY */}
        {frame === "day" && (
          <DayView date={anchor} blocks={[...courseBlocksForDate(anchor), ...gcalBlocksForDate(anchor)]} allDay={allDayForDate(anchor)} onAdd={() => openAdd(anchor)} onEditTask={openEdit} />
        )}

        {/* WEEK */}
        {frame === "week" && (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] grid" style={{ gridTemplateColumns: "44px repeat(7, minmax(0,1fr))" }}>
              <div />
              {(() => { const s = startOfWeek(anchor); return DOW_FULL.map((d, i) => { const day = new Date(s); day.setDate(s.getDate() + i); const isToday = localKey(day) === localKey(new Date()); return (
                <button key={i} onClick={() => openAdd(day)} className="text-center pb-1 cursor-pointer hover:bg-white/5 rounded">
                  <p className="text-[10px] uppercase tracking-widest text-white/40">{d}</p>
                  <p className={`text-sm font-mono tabular-nums ${isToday ? "text-emerald-300" : "text-zinc-300"}`}>{day.getDate()}</p>
                </button>
              ); }); })()}
              <HourAxis />
              {(() => { const s = startOfWeek(anchor); return DOW_FULL.map((_, i) => { const day = new Date(s); day.setDate(s.getDate() + i); return <DayColumn key={i} date={day} blocks={[...courseBlocksForDate(day), ...gcalBlocksForDate(day)]} allDay={allDayForDate(day)} onEditTask={openEdit} />; }); })()}
            </div>
          </div>
        )}

        {/* MONTH */}
        {frame === "month" && (
          <MonthView anchor={anchor} countForDate={(d) => [...courseBlocksForDate(d), ...gcalBlocksForDate(d)].length + allDayForDate(d).length} onPick={(d) => setSelectedDay(d)} />
        )}

        {/* YEAR */}
        {frame === "year" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MONTHS.map((m, mi) => (
              <MiniMonth key={mi} year={anchor.getFullYear()} month={mi} countForDate={(d) => [...courseBlocksForDate(d), ...gcalBlocksForDate(d)].length + allDayForDate(d).length} />
            ))}
          </div>
        )}

        {/* Selected day panel (month view) */}
        {selectedDay && (
          <DayPanel date={selectedDay} blocks={[...courseBlocksForDate(selectedDay), ...gcalBlocksForDate(selectedDay)]} allDay={allDayForDate(selectedDay)} onClose={() => setSelectedDay(null)} onAdd={() => openAdd(selectedDay)} onEditTask={openEdit} />
        )}
      </main>
      <EduBottomNav />
      <ScheduleTaskModal
        open={!!taskModal}
        onOpenChange={(o) => { if (!o) setTaskModal(null); }}
        defaultDate={taskModal?.date || undefined}
        deliverable={taskModal?.deliverable || undefined}
      />
    </>
  );
}

function HourAxis() {
  return (
    <div className="relative" style={{ height: (HOUR_END - HOUR_START) * PX_PER_HOUR }}>
      {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map((h, i) => (
        <div key={h} className="absolute right-1 text-[9px] text-white/30 font-mono" style={{ top: i * PX_PER_HOUR - 6 }}>{((h + 11) % 12) + 1}{h < 12 ? "a" : "p"}</div>
      ))}
    </div>
  );
}

function DayColumn({ date, blocks, allDay, onEditTask }) {
  const isToday = localKey(date) === localKey(new Date());
  return (
    <div className="border-l border-white/5 min-w-0">
      {allDay.length > 0 && (
        <div className="px-1 pb-1 flex flex-wrap gap-1">
          {allDay.slice(0, 3).map((a, i) => (
            a.kind === "task" && onEditTask ? (
              <button key={i} onClick={() => onEditTask(a.deliverable)} className="text-[9px] px-1.5 py-0.5 rounded truncate max-w-full hover:brightness-125" style={{ background: a.color + "22", color: a.color }} title="Edit task">{a.isExam ? "📝 " : "📘 "}{a.title}</button>
            ) : (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded truncate max-w-full" style={{ background: a.color + "22", color: a.color }}>{a.kind === "task" ? (a.isExam ? "📝 " : "📘 ") : ""}{a.title}</span>
            )
          ))}
        </div>
      )}
      <div className="relative" style={{ height: (HOUR_END - HOUR_START) * PX_PER_HOUR }}>
        {Array.from({ length: HOUR_END - HOUR_START - 1 }, (_, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-white/5" style={{ top: (i + 1) * PX_PER_HOUR }} />
        ))}
        {blocks.map((b, i) => {
          const top = Math.max(0, b.startMin - HOUR_START * 60) / 60 * PX_PER_HOUR;
          const height = Math.max(16, (b.endMin - b.startMin) / 60 * PX_PER_HOUR);
          return (
            <div key={i} className="absolute left-0.5 right-0.5 rounded p-1 overflow-hidden" style={{ top, height, background: b.color + "22", borderLeft: `2px solid ${b.color}` }}>
              <p className="text-[10px] font-medium text-zinc-100 truncate" style={{ color: b.color }}>{b.title}</p>
              {height > 24 && <p className="text-[9px] text-white/40 truncate">{b.subtitle}</p>}
            </div>
          );
        })}
        {isToday && <NowLine />}
      </div>
    </div>
  );
}

function DayView({ date, blocks, allDay, onAdd, onEditTask }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black p-4">
      <button onClick={onAdd} className="w-full mb-2 flex items-center justify-center gap-1 rounded border border-dashed border-white/10 text-[10px] uppercase tracking-widest text-white/40 hover:text-emerald-300 hover:border-emerald-400/30 py-1">
        <Plus className="h-3 w-3" /> Add task for {prettyDate(date)}
      </button>
      <div className="grid" style={{ gridTemplateColumns: "48px 1fr" }}>
        <HourAxis />
        <DayColumn date={date} blocks={blocks} allDay={allDay.length ? allDay : [{ kind: "gcal-all", title: "", color: "#000" }].filter(() => false)} onEditTask={onEditTask} />
      </div>
    </div>
  );
}

function NowLine() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes() - HOUR_START * 60;
  if (mins < 0 || mins > (HOUR_END - HOUR_START) * 60) return null;
  return <div className="absolute left-0 right-0 h-px bg-rose-400/70" style={{ top: mins / 60 * PX_PER_HOUR }}><div className="h-2 w-2 rounded-full bg-rose-400 -ml-1 -mt-1" /></div>;
}

function MonthView({ anchor, countForDate, onPick }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = new Date(first); gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const rows = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(gridStart); day.setDate(gridStart.getDate() + w * 7 + d);
      row.push(day);
    }
    rows.push(row);
  }
  return (
    <div className="rounded-lg border border-white/10 bg-black p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DOW_MINI.map((d, i) => <span key={i} className="text-center text-[10px] uppercase tracking-widest text-white/30">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span>)}
      </div>
      <div className="space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-1">
            {row.map((day) => {
              const inMonth = day.getMonth() === anchor.getMonth();
              const count = countForDate(day);
              const isToday = localKey(day) === localKey(new Date());
              return (
                <button key={localKey(day)} onClick={() => onPick(day)} disabled={!inMonth}
                  className={`rounded-md border p-1.5 text-left min-h-[64px] transition-colors ${inMonth ? "border-white/10 hover:border-emerald-400/30" : "border-transparent opacity-30"}`}>
                  <span className={`text-xs font-mono tabular-nums ${isToday ? "text-emerald-300" : "text-zinc-300"}`}>{day.getDate()}</span>
                  {count > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {Array.from({ length: Math.min(count, 4) }, (_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMonth({ year, month, countForDate }) {
  const first = new Date(year, month, 1);
  const gridStart = new Date(first); gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = [];
  for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); cells.push(d); }
  return (
    <div className="rounded-lg border border-white/10 bg-black p-3">
      <p className="text-[11px] font-medium text-zinc-200 mb-2">{MONTHS_SHORT[month]}</p>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const count = countForDate(d);
          return (
            <div key={i} className="aspect-square grid place-items-center text-[8px]">
              <span className={inMonth ? "text-white/40" : "text-white/15"}>{inMonth ? d.getDate() : ""}</span>
              {count > 0 && <span className="h-1 w-1 rounded-full bg-emerald-400/80 mt-0.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayPanel({ date, blocks, allDay, onClose, onAdd, onEditTask }) {
  return (
    <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-zinc-100">{prettyDate(date)}</p>
        <div className="flex items-center gap-3">
          <button onClick={onAdd} className="text-[10px] uppercase tracking-widest text-emerald-300 hover:text-emerald-200">+ Add task</button>
          <button onClick={onClose} className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white">Close</button>
        </div>
      </div>
      {[...allDay, ...blocks].length === 0 ? (
        <p className="text-sm text-white/30 text-center py-4">Nothing scheduled.</p>
      ) : (
        <div className="space-y-1.5">
          {allDay.map((a, i) => (
            a.kind === "task" && onEditTask ? (
              <button key={"a" + i} onClick={() => onEditTask(a.deliverable)} className="flex items-center gap-2 text-sm w-full text-left hover:bg-white/5 rounded px-1 -mx-1">
                <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                <span className="text-zinc-100">{a.isExam ? "📝 " : "📘 "}{a.title}</span>
                <span className="text-[10px] text-white/40">· due</span>
              </button>
            ) : (
              <div key={"a" + i} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                <span className="text-zinc-100">{a.kind === "task" ? (a.isExam ? "📝 " : "📘 ") : ""}{a.title}</span>
                {a.kind === "task" && <span className="text-[10px] text-white/40">· due</span>}
              </div>
            )
          ))}
          {blocks.map((b, i) => (
            <div key={"b" + i} className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
              <span className="text-zinc-100">{b.title}</span>
              {b.subtitle && <span className="text-[10px] text-white/40 flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{b.subtitle}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}