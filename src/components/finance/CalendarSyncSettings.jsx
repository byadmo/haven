import React from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Calendar, RefreshCw, Check, AlertCircle } from "lucide-react";

export default function CalendarSyncSettings() {
  const [syncing, setSyncing] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke("SyncCalendarEvents", {});
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Sync failed. Make sure Google Calendar is connected.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-white/50">Google Calendar</h3>
          <p className="text-lg font-semibold font-mono tracking-tight text-zinc-100 mt-1">Sync Reminders</p>
          <p className="text-xs text-white/40 mt-1">Push upcoming scheduled expenses and debt payments to Google Calendar with 1-day email reminders before each due date.</p>
        </div>
        <Calendar className="h-5 w-5 text-indigo-400 shrink-0 mt-1" />
      </div>

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

      <Button
        onClick={handleSync}
        disabled={syncing}
        className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
      >
        {syncing ? (
          <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> Syncing…</>
        ) : (
          <><Calendar className="h-4 w-4 mr-1.5" /> Sync Now</>
        )}
      </Button>
    </div>
  );
}