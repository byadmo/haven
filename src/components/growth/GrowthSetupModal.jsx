import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, Sparkles, Target, Brain, Dumbbell, BookOpen,
  Droplets, Heart, Users, DollarSign, Sun, Moon,
  ChevronRight, ArrowLeft, Clock, Flame
} from "lucide-react";
import { useSI } from "@/lib/SIContext";

// ── Focus areas ──
const FOCUS_AREAS = [
  {
    id: "fitness",
    label: "Fitness & Health",
    desc: "Exercise, nutrition, sleep, hydration",
    icon: "Dumbbell",
    color: "emerald",
    habits: [
      { name: "Daily Exercise / Workout", icon: "Dumbbell" },
      { name: "Walk 10,000 Steps", icon: "Dumbbell" },
      { name: "Hydrate & Health Check", icon: "Droplets" },
      { name: "Meal Prep / Healthy Eating", icon: "Heart" },
      { name: "Stretch / Mobility Routine", icon: "Dumbbell" },
      { name: "Sleep by 11 PM", icon: "Moon" },
      { name: "Morning Sunlight Exposure", icon: "Sun" },
    ],
  },
  {
    id: "productivity",
    label: "Deep Work & Productivity",
    desc: "Focus sessions, task management, discipline",
    icon: "Brain",
    color: "amber",
    habits: [
      { name: "Deep Work Session (2+ hrs)", icon: "Brain" },
      { name: "Review Top 3 Priorities", icon: "Target" },
      { name: "Time Block Tomorrow", icon: "Brain" },
      { name: "Digital Detox Hour", icon: "Brain" },
      { name: "Pomodoro Sessions (4 cycles)", icon: "Brain" },
      { name: "Clean Inbox to Zero", icon: "Target" },
      { name: "Plan Next Day (Evening)", icon: "Brain" },
    ],
  },
  {
    id: "learning",
    label: "Learning & Education",
    desc: "Reading, courses, skill-building",
    icon: "BookOpen",
    color: "blue",
    habits: [
      { name: "Read 20 Pages", icon: "BookOpen" },
      { name: "Study Session (1+ hr)", icon: "BookOpen" },
      { name: "Review Flashcards", icon: "BookOpen" },
      { name: "Write Daily Notes", icon: "BookOpen" },
      { name: "Listen to Educational Podcast", icon: "BookOpen" },
      { name: "Practice a Skill (30 min)", icon: "BookOpen" },
      { name: "Summarize What I Learned", icon: "BookOpen" },
    ],
  },
  {
    id: "mindfulness",
    label: "Mindfulness & Wellness",
    desc: "Meditation, journaling, mental health",
    icon: "Heart",
    color: "purple",
    habits: [
      { name: "Morning Meditation (10 min)", icon: "Heart" },
      { name: "Gratitude Journal Entry", icon: "BookOpen" },
      { name: "Evening Reflection", icon: "BookOpen" },
      { name: "Breathing Exercise", icon: "Heart" },
      { name: "No-Screen Wind Down", icon: "Heart" },
      { name: "Nature Walk", icon: "Dumbbell" },
      { name: "Unplugged Hour", icon: "Brain" },
    ],
  },
  {
    id: "finance",
    label: "Financial Discipline",
    desc: "Budgeting, saving, investing habits",
    icon: "DollarSign",
    color: "green",
    habits: [
      { name: "Review Daily Spending", icon: "DollarSign" },
      { name: "Log Transactions", icon: "DollarSign" },
      { name: "Check Investment Portfolio", icon: "Target" },
      { name: "No Impulse Spend Day", icon: "DollarSign" },
      { name: "Weekly Budget Review", icon: "DollarSign" },
      { name: "Read Financial News", icon: "BookOpen" },
      { name: "Contribute to Savings", icon: "DollarSign" },
    ],
  },
  {
    id: "social",
    label: "Social & Relationships",
    desc: "Connection, communication, community",
    icon: "Users",
    color: "rose",
    habits: [
      { name: "Call a Friend or Family", icon: "Users" },
      { name: "Send a Thoughtful Message", icon: "Users" },
      { name: "Social Activity (in person)", icon: "Users" },
      { name: "Practice Active Listening", icon: "Users" },
      { name: "Write a Thank-You Note", icon: "Heart" },
      { name: "Quality Time with Partner", icon: "Heart" },
      { name: "Join a Community Event", icon: "Users" },
    ],
  },
];

const COMMITMENT_LEVELS = [
  {
    id: "light",
    label: "Light — Start Small",
    desc: "1–2 habits. Easy to sustain, build momentum.",
    maxHabits: 2,
    icon: "Leaf",
  },
  {
    id: "moderate",
    label: "Moderate — Balanced Growth",
    desc: "3–4 habits. A healthy routine upgrade.",
    maxHabits: 4,
    icon: "Flame",
  },
  {
    id: "ambitious",
    label: "Ambitious — Full Transformation",
    desc: "5–6 habits. Go all in.",
    maxHabits: 6,
    icon: "Target",
  },
];

const HABIT_ICONS = {
  Dumbbell, Brain, BookOpen, Heart, Droplets, Target, Users, DollarSign, Sun, Moon, CheckCircle2, Clock, Flame,
};

const REMINDER_OPTIONS = [
  { value: "07:00", label: "7:00 AM — Morning" },
  { value: "09:00", label: "9:00 AM — Start of day" },
  { value: "12:00", label: "12:00 PM — Lunch" },
  { value: "17:00", label: "5:00 PM — Afternoon" },
  { value: "20:00", label: "8:00 PM — Evening" },
  { value: "21:30", label: "9:30 PM — Before bed" },
];

function FocusIcon({ name, className }) {
  const Icon = HABIT_ICONS[name] || Target;
  return <Icon className={className} />;
}

export default function GrowthSetupModal({ open, onComplete }) {
  const { addHabit, updateSettings } = useSI();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [focusArea, setFocusArea] = useState(null);
  const [commitment, setCommitment] = useState("moderate");
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [customHabit, setCustomHabit] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [weekStart, setWeekStart] = useState("monday");
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState("");

  const totalSteps = 6;

  const focusData = FOCUS_AREAS.find((f) => f.id === focusArea);
  const commitmentData = COMMITMENT_LEVELS.find((c) => c.id === commitment);
  const maxHabits = commitmentData?.maxHabits || 4;

  const toggleHabit = (name) => {
    setSelectedHabits((prev) => {
      if (prev.includes(name)) return prev.filter((h) => h !== name);
      if (prev.length >= maxHabits) return prev; // cap at commitment level
      return [...prev, name];
    });
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return true; // name is optional
      case 2: return focusArea !== null;
      case 3: return true;
      case 4: return selectedHabits.length > 0;
      case 5: return true;
      default: return true;
    }
  };

  const next = () => {
    if (step < totalSteps) setStep((s) => s + 1);
    else finish();
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const finish = async () => {
    setSaving(true);
    try {
      // Save settings
      await updateSettings({
        display_name: displayName.trim() || focusData?.label || "",
        primary_focus_goal: goal.trim() || `Build a ${focusData?.label?.toLowerCase() || "growth"} routine`,
        daily_reminder_time: reminderTime,
        week_starts_on: weekStart,
      });

      // Create selected habits
      for (const name of selectedHabits) {
        const f = focusData?.habits?.find((h) => h.name === name);
        await addHabit({
          name,
          icon: f?.icon || "Target",
          difficulty: commitment === "light" ? 2 : commitment === "ambitious" ? 4 : 3,
          frequency: "daily",
        });
      }

      // Add custom habit if provided
      if (customHabit.trim()) {
        await addHabit({
          name: customHabit.trim(),
          icon: "Target",
          difficulty: 3,
          frequency: "daily",
        });
      }

      onComplete();
    } catch (err) {
      console.error("Setup save failed:", err);
      onComplete(); // still close on error
    } finally {
      setSaving(false);
    }
  };

  const stepTitle = () => {
    switch (step) {
      case 1: return "Welcome! What should I call you?";
      case 2: return "What area do you want to focus on?";
      case 3: return "How deep do you want to go?";
      case 4: return `Pick your starter habits (up to ${maxHabits})`;
      case 5: return "When should I remind you?";
      case 6: return "Ready to grow!";
      default: return "";
    }
  };

  const stepProgress = `${step} / ${totalSteps}`;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/30">
              Setup {stepProgress}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-1 w-6 rounded-full transition-colors ${
                    i + 1 <= step ? "bg-amber-400" : "bg-white/10"
                  }`}
                />
              ))}
            </div>
          </div>
          <DialogTitle className="flex items-center gap-2 text-lg text-white">
            <Sparkles className="h-5 w-5 text-amber-400" />
            {stepTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-white/60">
                Your name helps personalize your Growth experience. It's optional — you can skip and change it later in Settings.
              </p>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Adam"
                className="bg-black border-white/10 text-white h-11"
                autoFocus
              />
              <p className="text-[10px] text-white/30">
                Used for journal entries and streak milestones. Never shared.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-xs text-white/60">
                What part of your life do you want to improve most right now? This tailors your habit suggestions.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {FOCUS_AREAS.map((area) => {
                  const active = focusArea === area.id;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => setFocusArea(area.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        active
                          ? "border-amber-400/40 bg-amber-500/10 text-white shadow-sm shadow-amber-500/5"
                          : "border-white/10 bg-black text-white/50 hover:border-white/20 hover:text-white/70"
                      }`}
                    >
                      <FocusIcon
                        name={area.icon}
                        className={`h-5 w-5 shrink-0 ${
                          active ? "text-amber-400" : "text-white/30"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${active ? "text-white" : "text-white/60"}`}>
                          {area.label}
                        </p>
                        <p className="text-[11px] text-white/40">{area.desc}</p>
                      </div>
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${
                          active ? "text-amber-400" : "text-transparent"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              {focusArea && (
                <div className="pt-1">
                  <label className="text-xs text-white/50 mb-1 block">
                    Optional: describe your specific goal
                  </label>
                  <Input
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder={`e.g. Build consistency in ${focusData?.label?.toLowerCase()}`}
                    className="bg-black border-white/10 text-white h-10"
                  />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <p className="text-xs text-white/60">
                How many habits do you want to start with? You can always add more later.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {COMMITMENT_LEVELS.map((level) => {
                  const active = commitment === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setCommitment(level.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        active
                          ? "border-amber-400/40 bg-amber-500/10 text-white"
                          : "border-white/10 bg-black text-white/50 hover:border-white/20"
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        active ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/30"
                      }`}>
                        {level.id === "light" ? (
                          <span className="text-sm">🌱</span>
                        ) : level.id === "moderate" ? (
                          <Flame className="h-4 w-4" />
                        ) : (
                          <Target className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${active ? "text-white" : "text-white/60"}`}>
                          {level.label}
                        </p>
                        <p className="text-[11px] text-white/40">{level.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && focusData && (
            <div className="space-y-3">
              <p className="text-xs text-white/60">
                Pick {maxHabits === 1 ? "a habit" : `up to ${maxHabits} habits`} to start with.{" "}
                <span className="text-amber-400/70">{selectedHabits.length} / {maxHabits} selected</span>
              </p>

              <div className="space-y-1.5">
                {focusData.habits.map((item) => {
                  const active = selectedHabits.includes(item.name);
                  const atLimit = !active && selectedHabits.length >= maxHabits;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => toggleHabit(item.name)}
                      disabled={atLimit}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                        active
                          ? "border-amber-400/40 bg-amber-500/10 text-white"
                          : atLimit
                          ? "border-white/5 bg-black text-white/20 cursor-not-allowed"
                          : "border-white/10 bg-black text-white/50 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <FocusIcon
                          name={item.icon}
                          className={`h-4 w-4 ${active ? "text-amber-400" : "text-white/30"}`}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      {active && <CheckCircle2 className="h-4 w-4 text-amber-400" />}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block flex items-center gap-1">
                  <span className="text-amber-400/70">+</span> Custom Habit (Optional)
                </label>
                <Input
                  value={customHabit}
                  onChange={(e) => setCustomHabit(e.target.value)}
                  placeholder="e.g. SystemVerilog / Review notes"
                  className="bg-black border-white/10 text-white"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <p className="text-xs text-white/60">
                Set a daily reminder to check in with your habits. You can change this anytime.
              </p>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Daily Reminder Time</label>
                <div className="grid grid-cols-2 gap-2">
                  {REMINDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReminderTime(opt.value)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors ${
                        reminderTime === opt.value
                          ? "border-amber-400/40 bg-amber-500/10"
                          : "border-white/10 bg-black text-white/50 hover:border-white/20"
                      }`}
                    >
                      <Clock className={`h-3.5 w-3.5 ${
                        reminderTime === opt.value ? "text-amber-400" : "text-white/30"
                      }`} />
                      <span className="text-[11px] font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Week Starts On</label>
                <div className="flex gap-2">
                  {["sunday", "monday"].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setWeekStart(day)}
                      className={`flex-1 p-2.5 rounded-lg border text-center text-sm transition-colors ${
                        weekStart === day
                          ? "border-amber-400/40 bg-amber-500/10 text-white"
                          : "border-white/10 bg-black text-white/50 hover:text-white/70"
                      }`}
                    >
                      {day === "monday" ? "Monday" : "Sunday"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 text-center py-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/15 border border-amber-500/30 mb-2">
                <Sparkles className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {displayName ? `${displayName}, you're all set!` : "You're all set!"}
                </p>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  {selectedHabits.length} {selectedHabits.length === 1 ? "habit" : "habits"} ready to track
                  {focusData ? ` in ${focusData.label}` : ""}.
                  {reminderTime !== "09:00" ? ` Daily reminders at ${reminderTime.slice(0, 5)}.` : ""}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {focusData && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/20 text-xs text-amber-300">
                    <FocusIcon name={focusData.icon} className="h-3 w-3" />
                    {focusData.label}
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 border border-white/10 text-xs text-white/60">
                  <Flame className="h-3 w-3" />
                  {commitment === "light" ? "Light start" : commitment === "moderate" ? "Moderate" : "Ambitious"}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
            <Button
              onClick={back}
              disabled={step === 1 || saving}
              variant="ghost"
              className="text-white/50 hover:text-white h-10 px-3 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>

            <Button
              onClick={next}
              disabled={!canAdvance() || saving}
              className="bg-amber-500 text-black hover:bg-amber-400 font-semibold h-10 px-5 rounded-xl text-xs"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-transparent animate-spin" />
                  Saving…
                </span>
              ) : step === totalSteps ? (
                <>
                  Start Growing <Sparkles className="h-3.5 w-3.5 ml-1" />
                </>
              ) : (
                <>
                  Continue <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}