import React, { useState } from "react";
import { Target, Plus, Trash2, Check } from "lucide-react";
import { useSI } from "@/lib/SIContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export default function HabitsPage() {
  const { habits, addHabit, toggleHabit, deleteHabit, getStreak, getTodayStatus } = useSI();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("CheckCircle");

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    await addHabit({ name: name.trim(), icon });
    setName("");
    setIcon("CheckCircle");
    setShowAdd(false);
  };

  return (
    <div className="dd-page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Habits</h1>
          <p className="text-sm text-white/50 mt-1">Build consistency one day at a time.</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Habit
        </Button>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/10 bg-black">
          <Target className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-4">No habits yet. Start building your routine.</p>
          <Button onClick={() => setShowAdd(true)} className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20" variant="outline">
            <Plus className="h-4 w-4 mr-1.5" /> Create Your First Habit
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map(h => {
            const done = getTodayStatus(h.id);
            const streak = getStreak(h.id);
            return (
              <div
                key={h.id}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black p-4 hover:border-white/20 transition-colors"
              >
                {/* Toggle */}
                <button
                  onClick={() => toggleHabit(h.id)}
                  className={`grid place-items-center rounded-lg border h-10 w-10 shrink-0 transition-all ${
                    done
                      ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                      : "border-white/15 bg-white/5 text-white/30 hover:border-amber-400/20"
                  }`}
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${done ? "text-white" : "text-white/70"}`}>{h.name}</p>
                  <p className="text-xs text-white/40">
                    {streak > 0 ? `${streak} day streak` : "No streak yet"}
                  </p>
                </div>

                {/* Streak badge */}
                {streak >= 3 && (
                  <div className="flex items-center gap-1 rounded-md bg-orange-500/10 border border-orange-400/20 px-2 py-1">
                    <span className="text-[10px] font-medium text-orange-300">{streak}</span>
                    <svg className="h-3 w-3 text-orange-400" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2c1 3 4 5 4 9a4 4 0 11-8 0c0-2 1-3 1-3s1 2 2 2c0-3-1-5 1-8z"/></svg>
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteHabit(h.id)}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
