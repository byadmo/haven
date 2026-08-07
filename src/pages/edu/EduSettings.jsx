import React from "react";
import { Link } from "react-router-dom";
import { Settings as SettingsIcon, CalendarCheck, CheckCircle2, Link2, ShieldCheck, RefreshCw, Loader2, GraduationCap, BadgeCheck, Pencil, Building2 } from "lucide-react";
import CustomizeNavModal from "@/components/nav/CustomizeNavModal";
import { EDU_PAGES, EDU_DEFAULT_NAV, EDU_LOCKED } from "@/lib/navConfig";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import EduTopBar from "@/components/edu/EduTopBar";
import EduBottomNav from "@/components/edu/EduBottomNav";
import PageTitle from "@/components/finance/PageTitle";
import Reveal from "@/components/finance/Reveal";
import { useEduSyncData, GCALENDAR_CONNECTOR_ID } from "@/lib/eduSyncContext";
import TaskTypesSettings from "@/components/edu/TaskTypesSettings";
import UiSizeSetting from "@/components/finance/UiSizeSetting";
import ThemeSettings from "@/components/settings/ThemeSettings";
import UniversitySelector from "@/components/edu/UniversitySelector";
import ProfileWizard from "@/components/edu/ProfileWizard";
import EduDangerZone from "@/components/edu/EduDangerZone";
import { isProfileComplete } from "@/lib/eduProfile";

export default function EduSettings() {
  const { settings, updateSettings, activeSemester, refresh, navItems, saveNavItems } = useEduSyncData();
  const [navOpen, setNavOpen] = React.useState(false);
  const { toast } = useToast();
  const [connected, setConnected] = React.useState(null); // null=loading, true/false
  const [email, setEmail] = React.useState("");
  const [connecting, setConnecting] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [profileComplete, setProfileComplete] = React.useState(isProfileComplete());
  const [wizardOpen, setWizardOpen] = React.useState(false);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await base44.functions.invoke("eduCalendar", { action: "status" });
      const d = res?.data ?? res;
      if (d?.connected) {
        setConnected(true);
        setEmail(d.email || "");
        if (d.calendar_id) updateSettings({ calendar_id: d.calendar_id, calendar_email: d.email, google_synced: true });
      } else {
        setConnected(false);
        setEmail("");
      }
    } catch {
      setConnected(false);
      setEmail("");
    }
  }, [updateSettings]);

  React.useEffect(() => { fetchStatus(); }, [fetchStatus]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await base44.connectors.connectAppUser(GCALENDAR_CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          // Ensure the EduSync calendar is created, then refresh status
          try {
            const r = await base44.functions.invoke("eduCalendar", { action: "setup" });
            const d = r?.data ?? r;
            if (d?.calendar_id) {
              await updateSettings({ calendar_id: d.calendar_id, calendar_email: d.email, google_synced: true });
              toast({
                title: "Google Calendar connected",
                description: d.using_primary_fallback
                  ? "Syncing to your primary calendar (creating a separate calendar needs the full Google Calendar scope)."
                  : d.calendar_created
                    ? "Created 'EduSync - Academic Schedule' calendar."
                    : "Using your 'EduSync - Academic Schedule' calendar.",
              });
            }
          } catch {}
          fetchStatus();
          setConnecting(false);
        }
      }, 500);
    } catch (e) {
      toast({ title: "Connection failed", description: e?.message || "Could not start Google OAuth.", variant: "destructive" });
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    try {
      await base44.connectors.disconnectAppUser(GCALENDAR_CONNECTOR_ID);
      setConnected(false);
      setEmail("");
      await updateSettings({ google_synced: false, calendar_id: "", calendar_email: "" });
      toast({ title: "Google Calendar disconnected" });
    } catch (e) {
      toast({ title: "Disconnect failed", description: e?.message, variant: "destructive" });
    }
  }

  async function handleSync() {
    if (!activeSemester) { toast({ title: "No active semester" }); return; }
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("eduCalendar", {
        action: "sync",
        semester_id: activeSemester.id,
        semester_start: activeSemester.start_date,
        semester_end: activeSemester.end_date,
        calendar_id: settings?.calendar_id,
        push_classes: settings?.push_classes !== false,
        push_assignments: settings?.push_assignments !== false,
        push_exams: settings?.push_exams !== false,
      });
      const d = res?.data ?? res;
      toast({ title: "Synced to calendar", description: `${d.created || 0} created · ${d.skipped || 0} already up to date.` });
    } catch (e) {
      toast({ title: "Sync failed", description: e?.message || "Make sure Google Calendar is connected.", variant: "destructive" });
    } finally { setSyncing(false); }
  }

  function toggle(key) { updateSettings({ [key]: !(settings?.[key] !== false) }); }

  return (
    <>
      <EduTopBar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PageTitle title="Settings" subtitle="Google Calendar & study preferences" icon={SettingsIcon} />

        {/* Profile */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 grid place-items-center rounded-lg border border-emerald-400/30 bg-emerald-500/10">
                <GraduationCap className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-zinc-100">{profileComplete ? "Profile Complete" : "Complete Your Profile"}</p>
                  {profileComplete && <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-white/40">{profileComplete ? "Your academic profile is set up." : "Finish setup to personalize Haven Education."}</p>
              </div>
            </div>
            <Button onClick={() => setWizardOpen(true)} variant="outline" className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10">
              {profileComplete ? "Edit Profile" : "Complete Profile"}
            </Button>
          </div>
        </Reveal>

        {/* University */}
        <Reveal>
          <UniversitySection />
        </Reveal>

        {/* Navigation */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/50">Navigation</p>
                <p className="text-base font-semibold font-mono tracking-tight text-zinc-100 mt-1">Customize Nav Bar</p>
                <p className="text-[11px] text-white/40 mt-1">Add, remove, and reorder the pages in your top and bottom navigation. Removed pages move into the More menu.</p>
              </div>
              <Button onClick={() => setNavOpen(true)} variant="outline" className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10 shrink-0">
                <Pencil className="h-4 w-4 mr-1.5" /> Customize Nav
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Google Calendar */}
        <Reveal>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-[10px] uppercase tracking-widest text-white/50">Google Calendar</p>
            </div>

            {connected === null ? (
              <div className="flex items-center gap-2 text-white/50 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Checking connection…</div>
            ) : connected ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-sm text-zinc-100">Connected</p>
                    <p className="text-[11px] text-white/40 font-mono">{email || settings?.calendar_email || "Google account"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSync} disabled={syncing} variant="outline" className="border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10">
                    {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />} Sync now
                  </Button>
                  <Button onClick={handleDisconnect} variant="outline" className="border-white/10 text-white/50 hover:bg-white/5">Disconnect</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm text-zinc-100">Not connected</p>
                  <p className="text-[11px] text-white/40">Connect to import courses and sync your schedule.</p>
                </div>
                <Button onClick={handleConnect} disabled={connecting} className="bg-emerald-500 text-black hover:bg-emerald-400">
                  {connecting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />} Connect Calendar
                </Button>
              </div>
            )}

            {connected && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-white/50">Sync preferences</p>
                <Toggle label="Push class schedules to calendar" checked={settings?.push_classes !== false} onChange={() => toggle("push_classes")} />
                <Toggle label="Push assignment deadlines to calendar" checked={settings?.push_assignments !== false} onChange={() => toggle("push_assignments")} />
                <Toggle label="Push exam dates to calendar" checked={settings?.push_exams !== false} onChange={() => toggle("push_exams")} />
                <Toggle label="Auto-detect calendar conflicts when scheduling study sessions" checked={settings?.detect_conflicts !== false} onChange={() => toggle("detect_conflicts")} />
              </div>
            )}
          </div>
        </Reveal>

        {/* Daily study goal */}
        <Reveal delay={0.03}>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Daily Study Goal</p>
            <div className="flex items-center gap-3">
              <Input
                type="number" min="0" step="5"
                value={settings?.daily_study_goal ?? 120}
                onChange={(e) => updateSettings({ daily_study_goal: Number(e.target.value) || 0 })}
                className="w-28 bg-black border-white/10"
              />
              <Label className="text-[11px] text-white/40">minutes per day</Label>
            </div>
          </div>
        </Reveal>

        {/* Task Types */}
        <Reveal delay={0.05}>
          <TaskTypesSettings />
        </Reveal>

        {/* Display Size — shared with Haven Finance */}
        <Reveal delay={0.06}>
          <UiSizeSetting />
        </Reveal>

        {/* Theme */}
        <Reveal delay={0.06}>
          <ThemeSettings currentTheme={settings?.theme || "midnight"} onChange={(k) => updateSettings({ theme: k })} />
        </Reveal>

        {/* Finance app link */}
        <Reveal delay={0.06}>
          <div className="rounded-lg border border-white/10 bg-black p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <p className="text-[10px] uppercase tracking-widest text-white/50">Haven Finance</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <div>
                  <p className="text-sm text-zinc-100">Linked</p>
                  <p className="text-[11px] text-white/40">Same Haven account — finances are always available.</p>
                </div>
              </div>
              <Link to="/" className="text-xs text-emerald-300 hover:text-emerald-200">Open Finance →</Link>
            </div>
          </div>
        </Reveal>

        {/* Danger zone */}
        <div className="space-y-4 pt-2">
          <EduDangerZone />
        </div>
      </main>
      <CustomizeNavModal
        open={navOpen}
        onOpenChange={setNavOpen}
        pages={EDU_PAGES}
        defaultNav={EDU_DEFAULT_NAV}
        locked={EDU_LOCKED}
        navItems={navItems}
        onSave={saveNavItems}
        accent="emerald"
        title="Customize Education Navigation"
      />
      <EduBottomNav />

      <ProfileWizard open={wizardOpen} onOpenChange={setWizardOpen} onCompleted={() => setProfileComplete(true)} />
    </>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs text-zinc-100 font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function UniversitySection() {
  const { settings, updateSettings } = useEduSyncData();
  const { toast } = useToast();
  const [uni, setUni] = React.useState({ name: settings?.university_name || "", domain: settings?.university_domain || "", catalogUrl: settings?.university_course_catalog_url || "" });
  const [program, setProgram] = React.useState(settings?.degree_program || "");
  const [spec, setSpec] = React.useState(settings?.specialization || "");

  React.useEffect(() => {
    setUni({ name: settings?.university_name || "", domain: settings?.university_domain || "", catalogUrl: settings?.university_course_catalog_url || "" });
    setProgram(settings?.degree_program || "");
    setSpec(settings?.specialization || "");
  }, [settings]);

  async function save(next) {
    try {
      await updateSettings({
        university_name: next?.name || "",
        university_domain: next?.domain || "",
        university_course_catalog_url: next?.catalogUrl || "",
        degree_program: program,
        specialization: spec,
      });
      toast({ title: "University saved" });
    } catch {
      toast({ title: "Couldn't save university", variant: "destructive" });
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-4 w-4 text-emerald-300" />
        <p className="text-[10px] uppercase tracking-widest text-white/50">University</p>
      </div>
      <UniversitySelector value={uni} onChange={(n) => { setUni(n || { name: "", domain: "", catalogUrl: "" }); save(n); }} />
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <Label className="text-[11px] text-white/50 mb-1 block">Degree program</Label>
          <Input value={program} onChange={(e) => setProgram(e.target.value)} onBlur={() => save(uni)} placeholder="e.g. Electrical Engineering" className="bg-black border-white/10 h-9" />
        </div>
        <div>
          <Label className="text-[11px] text-white/50 mb-1 block">Specialization</Label>
          <Input value={spec} onChange={(e) => setSpec(e.target.value)} onBlur={() => save(uni)} placeholder="e.g. Power Systems" className="bg-black border-white/10 h-9" />
        </div>
      </div>
      {(uni.domain || settings?.university_domain) && (
        <p className="text-[10px] text-white/30 font-mono mt-3 truncate">Domain: {uni.domain || settings?.university_domain}{(uni.catalogUrl || settings?.university_course_catalog_url) ? ` · catalog: ${uni.catalogUrl || settings?.university_course_catalog_url}` : ""}</p>
      )}
    </div>
  );
}