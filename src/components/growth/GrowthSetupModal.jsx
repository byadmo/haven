import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useSI } from "@/lib/SIContext";

const STARTER_HABITS = [
  { name: "Deep Work Session (2+ hrs)", icon: "Brain" },
  { name: "Daily Exercise / Workout", icon: "Dumbbell" },
  { name: "Read 20 Pages", icon: "BookOpen" },
  { name: "Hydrate & Health Check", icon: "Droplets" },
];

export default function GrowthSetupModal({ open, onComplete }) {
  const { addHabit } = useSI();
  const [selected, setSelected] = useState(["Deep Work Session (2+ hrs)", "Daily Exercise / Workout"]);
  const [customHabit, setCustomHabit] = useState("");
  const [step, setStep] = useState(1);

  const toggleSelect = (name) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleFinish = async () => {
    for (const item of selected) {
      await addHabit({ name: item, icon: "CheckCircle" });
    }
    if (customHabit.trim()) {
      await addHabit({ name: customHabit.trim(), icon: "Target" });
    }
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Sparkles className="h-5 w-5 text-amber-400" />
            Set Up Your Growth Routine
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-white/60">
            Select starter habits to kick off your daily tracking. You can customize or add more anytime.
          </p>

          <div className="space-y-2">
            {STARTER_HABITS.map((item) => {
              const active = selected.includes(item.name);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggleSelect(item.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                    active
                      ? "border-amber-400/40 bg-amber-500/10 text-white"
                      : "border-white/10 bg-black text-white/50 hover:border-white/20"
                  }`}
                >
                  <span className="text-sm font-medium">{item.name}</span>
                  <CheckCircle2 className={`h-4 w-4 ${active ? "text-amber-400" : "text-white/20"}`} />
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Custom Habit (Optional)</label>
            <Input
              value={customHabit}
              onChange={(e) => setCustomHabit(e.target.value)}
              placeholder="e.g. SystemVerilog coding / Review flashcards"
              className="bg-black border-white/10 text-white"
            />
          </div>

          <Button
            onClick={handleFinish}
            className="w-full bg-amber-500 text-black hover:bg-amber-400 font-semibold h-11 rounded-xl mt-2"
          >
            Complete Setup & Start Tracking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
