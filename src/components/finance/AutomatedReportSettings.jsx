import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Mail, Loader2, Send, Bell, BellOff } from "lucide-react";
import { format, subMonths } from "date-fns";

function buildMonthOptions() {
  const now = new Date();
  const opts = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: format(d, "MMMM yyyy"),
    });
  }
  return opts;
}

export default function AutomatedReportSettings() {
  const MONTHS = React.useMemo(buildMonthOptions, []);
  const [enabled, setEnabled] = React.useState(true);
  const [frequency, setFrequency] = React.useState("monthly");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [sendMonth, setSendMonth] = React.useState(MONTHS[0].value);
  const [sending, setSending] = React.useState(false);
  const [sendResult, setSendResult] = React.useState("");

  React.useEffect(() => {
    loadPrefs();
  }, []);

  async function loadPrefs() {
    try {
      const me = await base44.auth.me();
      setEnabled(me.report_enabled !== false);
      setFrequency(me.report_frequency || "monthly");
    } catch (e) {
      // defaults
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(val) {
    setEnabled(val);
    setSaving(true);
    try {
      await base44.auth.updateMe({ report_enabled: val });
    } catch (e) {
      setEnabled(!val);
    } finally {
      setSaving(false);
    }
  }

  async function changeFrequency(val) {
    setFrequency(val);
    setSaving(true);
    try {
      await base44.auth.updateMe({ report_frequency: val });
    } catch (e) {
      // revert
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNow() {
    setSending(true);
    setSendResult("");
    try {
      const me = await base44.auth.me();
      const res = await base44.functions.invoke("GenerateMonthlyReport", {
        month: sendMonth,
        user_id: me.id,
      });
      if (res.data?.error) {
        setSendResult("Error: " + res.data.error);
      } else {
        const label = MONTHS.find((m) => m.value === sendMonth)?.label;
        setSendResult(`Report sent to ${me.email} for ${label}.`);
      }
    } catch (e) {
      setSendResult("Could not send: " + (e?.message || e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Automated Email Reports</h3>
      </div>
      <p className="text-xs text-white/40 mb-4">
        Get a spending and debt progress summary delivered to your inbox automatically.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 py-3">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading preferences…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black p-3.5">
            <div className="flex items-center gap-2.5">
              {enabled ? <Bell className="h-4 w-4 text-emerald-400" /> : <BellOff className="h-4 w-4 text-white/30" />}
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {enabled ? "Reports enabled" : "Reports disabled"}
                </p>
                <p className="text-[11px] text-white/40">
                  {enabled ? `You'll receive a ${frequency} summary email.` : "No automated emails will be sent."}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={toggleEnabled} disabled={saving} />
          </div>

          {enabled && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black p-3.5">
                <div>
                  <Label className="text-sm font-medium text-zinc-200">Frequency</Label>
                  <p className="text-[11px] text-white/40">How often to receive reports</p>
                </div>
                <Select value={frequency} onValueChange={changeFrequency} disabled={saving}>
                  <SelectTrigger className="bg-black border-white/10 text-zinc-100 w-32 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-[11px] text-white/30 pl-1 -mt-1">
                {frequency === "monthly"
                  ? "Reports arrive on the 1st of every month at 9 AM (Toronto)."
                  : "Reports arrive every Monday at 9 AM (Toronto)."}
              </p>
            </>
          )}

          <div className="pt-3 border-t border-white/10">
            <Label className="text-sm font-medium text-zinc-200 mb-2 block">Send a report now</Label>
            <p className="text-[11px] text-white/40 mb-3">
              Manually trigger a financial summary for any month, sent to your email immediately.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={sendMonth} onValueChange={setSendMonth} disabled={sending}>
                <SelectTrigger className="bg-black border-white/10 text-zinc-100 h-10 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 max-h-72">
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSendNow} disabled={sending} className="bg-indigo-600 hover:bg-indigo-500 text-white h-10">
                {sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                {sending ? "Sending…" : "Send Report"}
              </Button>
            </div>
            {sendResult && (
              <p className={`text-xs mt-3 ${sendResult.startsWith("Error") || sendResult.startsWith("Could") ? "text-rose-400" : "text-emerald-400"}`}>
                {sendResult}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}