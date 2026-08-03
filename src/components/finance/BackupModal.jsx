import React from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload } from "lucide-react";

const ENTITIES = ["Transaction", "Debt", "Account", "Stock", "DebtPayment"];
// built-in fields the server (re)generates on create — strip before bulkCreate
const BUILTINS = ["id", "created_date", "updated_date", "created_by_id"];

export default function BackupModal() {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const fileRef = React.useRef(null);

  async function doExport() {
    setBusy(true);
    setStatus("Reading data…");
    try {
      const out = { exported_at: new Date().toISOString(), app: "debt-free" };
      for (const name of ENTITIES) {
        const rows = await base44.entities[name].list("-created_date", 5000);
        out[name] = rows;
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `debt-free-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Backup downloaded.");
    } catch (e) {
      setStatus("Export failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function doImport(file) {
    setBusy(true);
    setStatus("Importing…");
    try {
      const data = JSON.parse(await file.text());
      const report = [];
      for (const name of ENTITIES) {
        const rows = Array.isArray(data[name]) ? data[name] : [];
        const cleaned = rows.map((r) => {
          const copy = { ...r };
          BUILTINS.forEach((k) => delete copy[k]);
          return copy;
        }).filter((r) => Object.keys(r).length > 0);
        if (cleaned.length) {
          await base44.entities[name].bulkCreate(cleaned);
          report.push(`${name}: +${cleaned.length}`);
        }
      }
      setStatus(report.length ? "Imported — " + report.join(" · ") : "No records found in file.");
    } catch (e) {
      setStatus("Import failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Backup & Restore"
        className="h-8 w-8 rounded-md flex items-center justify-center border border-white/10 bg-transparent text-zinc-400 hover:text-white hover:border-white/25 transition-colors"
      >
        <Database className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Backup &amp; Restore</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Download your data as JSON, or restore from a backup file. Import adds records to your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button onClick={doExport} disabled={busy} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
              <Download className="h-4 w-4 mr-2" /> Export backup (.json)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="w-full border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" /> Import from file
            </Button>
            {status && <p className="text-xs text-zinc-400 text-center pt-1">{status}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}