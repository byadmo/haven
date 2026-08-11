import React, { useState, useMemo } from "react";
import { Target, Plus, Trash2, Check, Star, Filter, Copy, ListChecks } from "lucide-react";
import { useSI } from "@/lib/SIContext";
import { calculateHabitScore } from "@/lib/useHabitScore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const HABIT_ICONS = [
  { id: "Dumbbell", label: "Exercise" },
  { id: "BookOpen", label: "Reading" },
  { id: "Brain", label: "Study" },
  { id: "Droplets", label: "Water" },
  { id: "Moon", label: "Sleep" },
  { id: "Code", label: "Code" },
  { id: "Heart", label: "Health" },
  { id: "CheckCircle", label: "General" },
];

const HABIT_COLORS = [
  { id: "amber", swatch: "bg-amber-400" },
  { id: "emerald", swatch: "bg-emerald-400" },
  { id: "blue", swatch: "bg-blue-400" },
  { id: "purple", swatch: "bg-purple-400" },
  { id: "rose", swatch: "bg-rose-400" },
  { id: "cyan", swatch: "bg-cyan-400" },
];

const SCHEDULES = [
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "weekly", label: "Weekly" },
];

export default function HabitsPage() {
  const { habits, addHabit, toggleHabit, deleteHabit, getStreak, getTodayStatus } = useSI();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("CheckCircle");
  const [color, setColor] = useState("amber");
  const [difficulty, setDifficulty] = useState(3);
  const [schedule, setSchedule] = useState("daily");
  const [sortBy, setSortBy] = useState("name");
  const [filterColor, setFilterColor] = useState("all");
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState([]);

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    await addHabit({ name: name.trim(), icon, color, difficulty, frequency: schedule });
    toast({ title: "Habit created", description: `"${name.trim()}" added to your routine.` });
    setName("");
    setIcon("CheckCircle");
    setColor("amber");
    setDifficulty(3);
    setSchedule("daily");
    setShowAdd(false);
  };

  const handleDelete = async (id, habitName) => {
    await deleteHabit(id);
    toast({ title: "Habit deleted", description: `"${habitName}" removed.` });
  };

  const handleClone = async (h) => {
    await addHabit({
      name: `${h.name} (copy)`,
      icon: h.icon || "CheckCircle",
      color: h.color || "amber",
      difficulty: h.difficulty ?? 3,
      frequency: h.frequency || "daily",
    });
    toast({ title: "Habit cloned", description: `"${h.name}" duplicated.` });
  };

  const handleBatchToggle = async () => {
    for (const id of selected) {
      const done = getTodayStatus(id);
      if (!done) await toggleHabit(id);
    }
    toast({ title: "Batch complete", description: `${selected.length} habits marked done.` });
    setSelected([]);
    setBatchMode(false);
  };

  const filtered = useMemo(() => {
    let list = [...habits];
    if (filterColor !== "all") list = list.filter(h => (h.color || "amber") === filterColor);
    switch (sortBy) {
      case "streak":
        list.sort((a, b) => getStreak(b.id) - getStreak(a.id));
        break;
      case "score":
        list.sort((a, b) => calculateHabitScore({ habit: b }) - calculateHabitScore({ habit: a }));
        break;
      case "difficulty":
        list.sort((a, b) => (b.difficulty ?? 3) - (a.difficulty ?? 3));
        break;
      default:
        list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [habits, sortBy, filterColor, getStreak]);

  const scoreColor = (score) => {
    if (score >= 0.8) return "bg-emerald-400";
    if (score >= 0.5) return "bg-amber-400";
    if (score >= 0.2) return "bg-orange-400";
    return "bg-red-400";
  };

  const scheduleLabel = (s) => {
    const found = SCHEDULES.find(x => x.id === s);
    return found ? found.label : "Daily";
  };

  return (
    <div className="dd-page-enter space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Habits</h1>
          <p className="text-sm text-white/50 mt-1">Build consistency one day at a time.</p>
        </div>
        <div className="flex items-center gap-2">
          {habits.length > 0 && (
            <Button
              onClick={() => { setBatchMode(!batchMode); setSelected([]); }}
              variant="outline"
              className={`${batchMode ? "bg-amber-500/20 border-amber-400/40 text-amber-300" : "border-white/10 text-white/60 hover:text-white"}`}
            >
              <ListChecks className="h-4 w-4 mr-1.5" /> {batchMode ? "Cancel" : "Batch"}
            </Button>
          )}
          {batchMode && (
            <Button
              onClick={handleBatchToggle}
              disabled={selected.length === 0}
              className="bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30"
              variant="outline"
            >
              <Check className="h-4 w-4 mr-1.5" /> Done ({selected.length})
            </Button>
          )}
          <Button
            onClick={() => setShowAdd(true)}
            className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Habit
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      {habits.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-white/30" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 rounded-md border border-white/10 bg-black text-xs text-white/70 px-2 outline-none focus:border-amber-400/40"
          >
            <option value="name">Sort: Name</option>
            <option value="streak">Sort: Streak</option>
            <option value="score">Sort: Strength</option>
            <option value="difficulty">Sort: Difficulty</option>
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterColor("all")}
              className={`h-6 w-6 rounded-md border grid place-items-center text-[9px] ${filterColor === "all" ? "border-amber-400/50 bg-amber-500/10 text-amber-300" : "border-white/10 text-white/30"}`}
              title="All colors"
            >
              A
            </button>
            {HABIT_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterColor(filterColor === c.id ? "all" : c.id)}
                className={`h-6 w-6 rounded-md border ${c.swatch} ${filterColor === c.id ? "ring-2 ring-white/40 border-white/30" : "border-white/10 opacity-50 hover:opacity-100"}`}
                title={c.id}
              />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/10 bg-black">
          <Target className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-4">No habits yet. Start building your routine.</p>
          <Button onClick={() => setShowAdd(true)} className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20" variant="outline">
            <Plus className="h-4 w-4 mr-1.5" /> Create Your First Habit
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(h => {
            const done = getTodayStatus(h.id);
            const streak = getStreak(h.id);
            const score = calculateHabitScore({ habit: h });
            const scorePct = Math.round(score * 100);
            const habitColor = h.color || "amber";
            return (
              <div
                key={h.id}
                className={`group flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                  batchMode && selected.includes(h.id)
                    ? "border-amber-400/50 bg-amber-500/10"
                    : "border-white/10 bg-black hover:border-white/20"
                }`}
              >
                {/* Color dot */}
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  { amber: "bg-amber-400", emerald: "bg-emerald-400", blue: "bg-blue-400", purple: "bg-purple-400", rose: "bg-rose-400", cyan: "bg-cyan-400" }[habitColor] || "bg-amber-400"
                }`} />

                {/* Toggle */}
                <button
                  onClick={() => batchMode
                    ? setSelected(prev => prev.includes(h.id) ? prev.filter(x => x !== h.id) : [...prev, h.id])
                    : toggleHabit(h.id)}
                  className={`grid place-items-center rounded-lg border h-10 w-10 shrink-0 transition-all ${
                    batchMode
                      ? selected.includes(h.id)
                        ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                        : "border-white/15 bg-white/5 text-white/20"
                      : done
                        ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                        : "border-white/15 bg-white/5 text-white/30 hover:border-amber-400/20"
                  }`}
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${done ? "text-white" : "text-white/70"}`}>{h.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <p className={`text-xs ${streak > 0 ? "text-orange-300" : "text-white/40"}`}>
                      {streak > 0 ? `🔥 ${streak} day streak` : "No streak yet"}
                    </p>
                    <span className="text-[10px] text-white/25">·</span>
                    <span className="text-[10px] text-white/30">{scheduleLabel(h.frequency)}</span>
                    <span className="text-[10px] text-white/25">·</span>
                    <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                      {"★".repeat(h.difficulty ?? 3)}
                      <span className="text-white/15">{"★".repeat(5 - (h.difficulty ?? 3))}</span>
                    </span>
                  </div>
                  {/* Strength bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 flex-1 max-w-[120px] rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full ${scoreColor(score)} transition-all duration-500`} style={{ width: `${scorePct}%` }} />
                    </div>
                    <span className={`text-[9px] font-mono tabular-nums ${scorePct >= 80 ? "text-emerald-400" : scorePct >= 50 ? "text-amber-300" : "text-white/30"}`}>
                      {scorePct}%
                    </span>
                  </div>
                </div>

                {/* Streak badge */}
                {streak >= 3 && (
                  <div className="flex items-center gap-1 rounded-md bg-orange-500/10 border border-orange-400/20 px-2 py-1">
                    <span className="text-[10px] font-medium text-orange-300">{streak}</span>
                    <svg className="h-3 w-3 text-orange-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2c1 3 4 5 4 9a4 4 0 11-8 0c0-2 1-3 1-3s1 2 2 2c0-3-1-5 1-8z"/></svg>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleClone(h)}
                    className="text-white/30 hover:text-amber-300 transition-colors p-1"
                    title="Clone habit"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(h.id, h.name)}
                    className="text-white/30 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Habit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-white">New Habit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Habit Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Morning workout"
                autoFocus
                className="bg-black border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Icon</label>
              <div className="grid grid-cols-4 gap-2">
                {HABIT_ICONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 transition-colors ${
                      icon === opt.id
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                        : "border-white/10 bg-black text-white/40 hover:border-white/20"
                    }`}
                  >
                    <span className="text-[10px]">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Color Tag</label>
              <div className="flex gap-2">
                {HABIT_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`h-8 w-8 rounded-lg ${c.swatch} transition-all ${
                      color === c.id ? "ring-2 ring-white/50 scale-105" : "opacity-50 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Difficulty</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`p-1.5 rounded-md transition-all ${
                      d <= difficulty ? "text-amber-300" : "text-white/20 hover:text-white/40"
                    }`}
                  >
                    <Star className="h-5 w-5 fill-current" />
                  </button>
                ))}
                <span className="text-[10px] text-white/40 ml-2">
                  {difficulty <= 2 ? "Easy" : difficulty === 3 ? "Moderate" : difficulty === 4 ? "Hard" : "Elite"}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Schedule</label>
              <div className="grid grid-cols-4 gap-2">
                {SCHEDULES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSchedule(s.id)}
                    className={`rounded-lg border p-2 text-[11px] font-medium transition-colors ${
                      schedule === s.id
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                        : "border-white/10 bg-black text-white/40 hover:border-white/20"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} className="text-white/50">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30">
                Create Habit
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}