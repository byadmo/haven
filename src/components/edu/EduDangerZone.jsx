import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useEduSyncData } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { clearEduData, clearEduProfile } from "@/lib/eduProfile";

// Education data entities. Reset keeps EduSettings; Delete Account wipes it too.
const EDU_DATA_ENTITIES = ["Semester", "Course", "Deliverable", "StudySession", "Material", "Focus"];

export default function EduDangerZone() {
  const { refresh } = useEduSyncData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // "reset" | "delete" | null
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  async function deleteEduRecords(includeSettings) {
    const ents = includeSettings ? [...EDU_DATA_ENTITIES, "EduSettings"] : EDU_DATA_ENTITIES;
    await Promise.all(ents.map((name) => base44.entities[name].deleteMany({})));
  }

  async function doReset() {
    if (confirmText !== "DELETE") return;
    setBusy(true);
    try {
      await deleteEduRecords(false);
      clearEduData();
      await refresh?.();
      toast({ title: "All education data has been reset." });
      setModal(null);
      setConfirmText("");
    } catch (e) {
      toast({ title: "Reset failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (confirmText !== "DELETE") return;
    setBusy(true);
    try {
      await deleteEduRecords(true);
      clearEduProfile();
      toast({ title: "Haven Education account deleted." });
      setModal(null);
      setConfirmText("");
      navigate("/");
    } catch (e) {
      toast({ title: "Failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Reset Education Data */}
      <Reveal>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-amber-300" />
            <p className="text-[10px] uppercase tracking-widest text-amber-300">Reset Education Data</p>
          </div>
          <p className="text-xs text-white/55 mb-4 leading-relaxed">
            This will permanently delete all courses, deliverables, study sessions, course materials, study streaks, and semester data. This action cannot be undone.
          </p>
          <Button onClick={() => setModal("reset")} variant="outline" className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Reset All Education Data
          </Button>
        </div>
      </Reveal>

      {/* Delete Education Account */}
      <Reveal delay={0.04}>
        <div className="rounded-lg border border-rose-500/50 bg-rose-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="h-4 w-4 text-rose-300" />
            <p className="text-[10px] uppercase tracking-widest text-rose-300">Delete Education Account</p>
          </div>
          <p className="text-xs text-white/55 mb-4 leading-relaxed">
            This will permanently remove your Haven Education profile, all academic data, and reset the Education app to its initial state. Your Haven Finance data will not be affected.
          </p>
          <Button onClick={() => setModal("delete")} variant="outline" className="border-rose-500/50 text-rose-300 hover:bg-rose-500/10">
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete Education Account
          </Button>
        </div>
      </Reveal>

      {/* Confirmation modal (shared) */}
      <Dialog open={!!modal} onOpenChange={(o) => { if (!o) { setModal(null); setConfirmText(""); } }}>
        <DialogContent className="max-w-md bg-black border-white/10">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-zinc-50 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              {modal === "delete" ? "Delete Education Account" : "Reset Education Data"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60 leading-relaxed">
            {modal === "delete"
              ? "Are you sure? This will remove your Education profile and all academic data. Your Finance data is safe. Type 'DELETE' to confirm."
              : "Are you sure? This will delete ALL education data. Type 'DELETE' to confirm."}
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="bg-black border-white/10"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModal(null); setConfirmText(""); }} className="border-white/10 text-white/60">Cancel</Button>
            <Button
              onClick={modal === "delete" ? doDelete : doReset}
              disabled={busy || confirmText !== "DELETE"}
              className="bg-rose-500 text-white hover:bg-rose-400 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {modal === "delete" ? "Delete Account" : "Reset Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Reveal({ children, delay = 0 }) {
  return <div className="splash-fade-in" style={{ animationDelay: `${delay}s`, width: "100%" }}>{children}</div>;
}