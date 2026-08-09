import React, { useState } from "react";
import { User, Type, Calendar, Trash2, AlertTriangle, Save, CheckCircle2 } from "lucide-react";
import { useSI } from "@/lib/SIContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import ThemeSettings from "@/components/settings/ThemeSettings";
import { THEMES } from "@/lib/themes";
import { getUiScale, setUiScale, UI_SCALE_MIN, UI_SCALE_MAX } from "@/lib/uiScale";

export default function GrowthSettingsPage() {
  const { settings, updateSettings, resetGrowthData, habits, entries, reflections } = useSI();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(settings.display_name || "");
  const [focusGoal, setFocusGoal] = useState(settings.primary_focus_goal || "");
  const [saving, setSaving] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetText, setResetText] = useState("");
  const [resetting, setResetting] = useState(false);
  const [uiScale, setUiScaleState] = useState(() => getUiScale());

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateSettings({ display_name: displayName, primary_focus_goal: focusGoal });
    setSaving(false);
    toast({ title: "Profile saved", description: "Your Growth profile has been updated." });
  };

  const handleThemeChange = (themeKey) => {
    updateSettings({ theme: themeKey });
    toast({ title: "Theme applied", description: `${THEMES[themeKey]?.label} is now active across all modules.` });
  };

  const handleUiScaleChange = (v) => {
    setUiScaleState(v);
    setUiScale(v);
    updateSettings({ ui_scale: Math.round(v * 100) });
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetGrowthData();
      toast({ title: "Growth data reset", description: "All habits, check-ins, and reflections have been cleared." });
      setShowReset(false);
      setResetText("");
    } catch {
      toast({ title: "Reset failed", description: "Something went wrong — please try again." });
    } finally {
      setResetting(false);
    }
  };

  const totalData = habits.length + entries.length + reflections.length;

  return (
    <div className="dd-page-enter space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Growth Settings</h1>
        <p className="text-sm text-white/50 mt-1">Manage your profile, appearance, and data.</p>
      </div>

      {/* Profile */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Profile</h2>
        </div>

        <div>
          <Label className="text-xs text-white/50 mb-1.5 block">Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="bg-black border-white/10 text-white"
          />
        </div>

        <div>
          <Label className="text-xs text-white/50 mb-1.5 block">Primary Focus Goal</Label>
          <Input
            value={focusGoal}
            onChange={(e) => setFocusGoal(e.target.value)}
            placeholder="e.g. Build a 90-day deep work streak"
            className="bg-black border-white/10 text-white"
          />
        </div>

        <Button
          onClick={handleSaveProfile}
          disabled={saving}
          className="bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30"
          variant="outline"
        >
          {saving ? <CheckCircle2 className="h-4 w-4 mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      {/* Appearance — Theme */}
      <ThemeSettings currentTheme={settings.theme || "midnight"} onChange={handleThemeChange} />

      {/* Display Size / UI Scale — GLOBAL */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Type className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Display Size</h3>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Adjust text and element size. Applies globally across all Haven modules (Finance, Education, Growth).
        </p>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40 tabular-nums w-8">{Math.round(UI_SCALE_MIN * 100)}%</span>
          <Slider
            value={[uiScale]}
            min={UI_SCALE_MIN}
            max={UI_SCALE_MAX}
            step={0.01}
            onValueChange={([v]) => handleUiScaleChange(v)}
            className="flex-1"
          />
          <span className="text-[10px] text-white/40 tabular-nums w-9 text-right">{Math.round(UI_SCALE_MAX * 100)}%</span>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {[
              { label: "S", value: 0.9 },
              { label: "M", value: 1 },
              { label: "L", value: 1.05 },
              { label: "XL", value: 1.15 },
            ].map((p) => {
              const active = Math.abs(uiScale - p.value) < 0.005;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleUiScaleChange(p.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                    active
                      ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                      : "border-white/10 text-zinc-300 hover:border-white/30"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <span className="text-sm font-mono tabular-nums text-white">{Math.round(uiScale * 100)}%</span>
        </div>
      </div>

      {/* Google Calendar Sync */}
      <div className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Google Calendar</h3>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Connect Google Calendar to sync habit reminders and your study schedule.
        </p>

        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm text-white">
              {settings.google_calendar_connected ? "Connected" : "Not connected"}
            </p>
            {settings.calendar_email && (
              <p className="text-xs text-white/40 mt-0.5">{settings.calendar_email}</p>
            )}
          </div>
          <Button
            variant="outline"
            className={settings.google_calendar_connected
              ? "border-red-400/30 text-red-300 hover:bg-red-500/10"
              : "border-amber-400/30 text-amber-300 hover:bg-amber-500/10"
            }
            onClick={() => {
              if (settings.google_calendar_connected) {
                updateSettings({ google_calendar_connected: false, calendar_email: "" });
                toast({ title: "Calendar disconnected" });
              } else {
                // In live mode this triggers OAuth; in local mode show a note
                toast({ title: "Calendar sync", description: "Google Calendar OAuth requires the live Base44 backend." });
              }
            }}
          >
            {settings.google_calendar_connected ? "Disconnect" : "Connect"}
          </Button>
        </div>
      </div>

      {/* Danger Zone — Reset Data */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-semibold text-white">Danger Zone</h3>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Reset all Growth data ({totalData} items: {habits.length} habits, {entries.length} check-ins, {reflections.length} reflections). This cannot be undone.
        </p>

        <Button
          variant="outline"
          className="border-red-400/30 text-red-300 hover:bg-red-500/10"
          onClick={() => setShowReset(true)}
        >
          <Trash2 className="h-4 w-4 mr-1.5" /> Reset Growth Data
        </Button>

        <Dialog open={showReset} onOpenChange={setShowReset}>
          <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Reset All Growth Data?
              </DialogTitle>
              <DialogDescription className="text-white/50">
                This will permanently delete all habits, streaks, check-ins, and reflections. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <Label className="text-xs text-white/50 mb-1.5 block">
                Type <span className="text-red-400 font-mono">RESET</span> to confirm
              </Label>
              <Input
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                placeholder="RESET"
                className="bg-black border-white/10 text-white"
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="text-white/50">Cancel</Button>
              </DialogClose>
              <Button
                disabled={resetText !== "RESET" || resetting}
                onClick={handleReset}
                className="bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30"
              >
                {resetting ? "Resetting..." : "Reset Everything"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
