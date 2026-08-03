import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Calendar, RefreshCw, Check, AlertCircle, Trash2, Link2, Link2Off, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const REMINDER_OPTIONS = [
  { label: "1 hour before", value: "60" },
  { label: "1 day before", value: "1440" },
  { label: "3 days before", value: "4320" },
  { label: "1 week before", value: "10080" },
  { label: "No reminder", value: "0" },
];

export default function CalendarSyncSettings() {
  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [events, setEvents] = React.useState([]);
  const [loadingEvents, setLoadingEvents] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [showReconnect, setShowReconnect] = React.useState(false);
  const [removeAllOpen, setRemoveAllOpen] = React.useState(false);
  const [deletingAll, setDeletingAll] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState(null);

  // Persisted preferences
  const [includeExpenses, setIncludeExpenses] = React.useState(() => localStorage.getItem("cal_sync_expenses") !== "false");
  const [includeDebts, setIncludeDebts] = React.useState(() => localStorage.getItem("cal_sync_debts") !== "false");
  const [reminderMinutes, setReminderMinutes] = React.useState(() => localStorage.getItem("cal_sync_reminder") || "1440");

  React.useEffect(() => { localStorage.setItem("cal_sync_expenses", String(includeExpenses)); }, [includeExpenses]);
  React.useEffect(() => { localStorage.setItem("cal_sync_debts", String(includeDebts)); }, [includeDebts]);
  React.useEffect(() => { localStorage.setItem("cal_sync_reminder", reminderMinutes); }, [reminderMinutes]);

  async function loadEvents() {
    setLoadingEvents(true);
    try {
      const res = await base44.functions.invoke("SyncCalendarEvents", { action: "list" });
      setEvents(res.data?.events || []);
    } catch (e) {
      // silent fail
    } finally {
      setLoadingEvents(false);
    }
  }

  React.useEffect(() => { loadEvents(); }, []);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke("SyncCalendarEvents", {
        action: "sync",
        include_expenses: includeExpenses,
        include_debts: includeDebts,
        reminder_minutes: parseInt(reminderMinutes),
      });
      setResult(res.data);
      loadEvents();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Sync failed. Make sure Google Calendar is connected.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDeleteEvent(eventId) {
    setDeletingId(eventId);
    try {
      await base44.functions.invoke("SyncCalendarEvents", { action: "delete", event_id: eventId });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (e) {
      setError("Failed to delete event.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await base44.functions.invoke("SyncCalendarEvents", { action: "delete_all" });
      setEvents([]);
      setResult(null);
    } catch (e) {
      setError("Failed to remove all events.");
    } finally {
      setDeletingAll(false);
      setRemoveAllOpen(false);
    }
  }

  const fmtDate = (d) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-white/50">Google Calendar</h3>
          <p className="text-lg font-semibold font-mono tracking-tight text-zinc-100 mt-1">Sync Reminders</p>
          <p className="text-xs text-white/40 mt-1">Push upcoming expenses and debt payments to Google Calendar with email reminders before each due date.</p>
        </div>
        <Calendar className="h-5 w-5 text-indigo-400 shrink-0 mt-1" />
      </div>

      {/* Connected account row */}
      <div className="flex items-center justify-between rounded-md border border-white/10 bg-black px-3 py-2.5 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-300">Calendar account connected</span>
        </div>
        <button
          onClick={() => setShowReconnect(true)}
          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <Link2Off className="h-3.5 w-3.5" /> Change Account
        </button>
      </div>

      {/* Sync preferences */}
      <div className="space-y-2.5 mb-4">
        <label className="flex items-center justify-between rounded-md border border-white/10 bg-black px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-200">💸 Scheduled Expenses</span>
          </div>
          <Switch checked={includeExpenses} onCheckedChange={setIncludeExpenses} />
        </label>
        <label className="flex items-center justify-between rounded-md border border-white/10 bg-black px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-200">💳 Debt Payments</span>
          </div>
          <Switch checked={includeDebts} onCheckedChange={setIncludeDebts} />
        </label>
      </div>

      {/* Reminder timing */}
      <div className="mb-4">
        <label className="text-xs uppercase tracking-widest text-white/50 mb-1.5 block">Reminder Timing</label>
        <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
          <SelectTrigger className="bg-black border-white/10 text-zinc-200 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 mb-3">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-300">{error}</p>
        </div>
      )}

      {result && !error && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 mb-3">
          <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-300">
            {result.total === 0
              ? "No upcoming expenses or debt payments to sync."
              : `Synced ${result.created} event${result.created !== 1 ? "s" : ""}${result.skipped > 0 ? ` · ${result.skipped} already up to date` : ""}.`}
          </p>
        </div>
      )}

      {/* Synced events list */}
      {!syncing && events.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-xs uppercase tracking-widest text-white/50 hover:text-white/70 transition-colors mb-2"
          >
            <span>Synced Events ({events.length})</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 pt-1">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black px-3 py-2 group hover:border-white/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-200 truncate">{ev.summary}</p>
                        <p className="text-[10px] text-white/40 mt-0.5 tnum">{fmtDate(ev.date)}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        disabled={deletingId === ev.id}
                        className="h-7 w-7 flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors shrink-0 disabled:opacity-50"
                        aria-label="Remove event"
                      >
                        {deletingId === ev.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setRemoveAllOpen(true)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-rose-400/70 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove all events
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleSync}
          disabled={syncing || (!includeExpenses && !includeDebts)}
          className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
        >
          {syncing ? (
            <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Syncing…</>
          ) : (
            <><Calendar className="h-4 w-4 mr-1.5" /> Sync Now</>
          )}
        </Button>
      </div>

      {/* Reconnect dialog */}
      <Dialog open={showReconnect} onOpenChange={setShowReconnect}>
        <DialogContent className="bg-black border-white/10 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Change Calendar Account</DialogTitle>
            <DialogDescription className="text-zinc-500">
              The connected Google Calendar account is managed at the platform level via a shared OAuth connection. To reconnect with a different Google account:
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-white/10 bg-black px-3 py-3 mt-2">
            <ol className="space-y-2 text-xs text-zinc-400 list-decimal list-inside">
              <li>Open the app builder chat where you manage this app.</li>
              <li>Ask the assistant to <span className="text-indigo-400">reconnect Google Calendar</span> with a different account.</li>
              <li>This will disconnect the current account and prompt a new Google sign-in.</li>
            </ol>
          </div>
          <DialogFooter className="pt-3">
            <DialogClose asChild>
              <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5">Got it</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove all dialog */}
      <Dialog open={removeAllOpen} onOpenChange={setRemoveAllOpen}>
        <DialogContent className="bg-black border-white/10 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Remove All Synced Events?</DialogTitle>
            <DialogDescription className="text-zinc-500">
              This will permanently delete all {events.length} calendar event{events.length !== 1 ? "s" : ""} synced from Haven. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3 gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="border-white/10 text-zinc-400 hover:bg-white/5">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {deletingAll ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Removing…</> : <><Trash2 className="h-4 w-4 mr-1.5" /> Remove All</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}