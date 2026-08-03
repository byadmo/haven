import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UploadCloud, Loader2, Trash2, Check, ImageIcon, Camera } from "lucide-react";
import confetti from "canvas-confetti";

const ACCOUNTS = ["TFSA", "RRSP", "RESP", "FHSA", "Non-Registered", "Cash", "Other"];

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    holdings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Stock ticker symbol, e.g. AAPL" },
          name: { type: "string", description: "Company name if visible" },
          shares: { type: "number", description: "Number of shares held" },
          avg_buy_price: { type: "number", description: "Average cost per share" },
          pnl: { type: "number", description: "Unrealized profit/loss if shown" },
        },
        required: ["symbol", "shares"],
      },
    },
  },
};

function normalizeRow(r) {
  return {
    symbol: (r.symbol || "").toUpperCase().trim(),
    name: r.name || (r.symbol || "").toUpperCase().trim(),
    shares: Number(r.shares) || 0,
    avg_buy_price: Number(r.avg_buy_price) || 0,
    pnl: Number(r.pnl) || 0,
    account: "Non-Registered",
    included: true,
  };
}

export default function StockImportModal({ open, onOpenChange, onSaved }) {
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [parsing, setParsing] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setRows([]);
    setError("");
    setDone(0);
  }

  function handleFile(f) {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setRows([]);
    setError("");
  }

  function updateRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleParse() {
    if (!file || parsing) return;
    setParsing(true);
    setError("");
    setRows([]);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: up.file_url,
        json_schema: EXTRACT_SCHEMA,
      });
      let list = [];
      if (Array.isArray(res?.output)) list = res.output;
      else if (res?.output?.holdings) list = res.output.holdings;
      if (!Array.isArray(list)) list = [];
      const norm = list.map(normalizeRow).filter((r) => r.symbol && r.shares);
      if (!norm.length) {
        setError("No holdings found in this file. Try a clearer screenshot or PDF.");
      } else {
        setRows(norm);
      }
    } catch (e) {
      setError("Could not parse this file — AI may be busy, please retry.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (importing) return;
    const toCreate = rows.filter((r) => r.included && r.symbol && r.shares);
    if (!toCreate.length) return;
    setImporting(true);
    setDone(0);
    try {
      for (const r of toCreate) {
        await base44.entities.Stock.create({
          symbol: r.symbol,
          name: r.name || r.symbol,
          shares: r.shares,
          avg_buy_price: r.avg_buy_price,
          account: r.account,
        });
        setDone((d) => d + 1);
      }
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      onSaved?.();
      onOpenChange?.(false);
    } catch (e) {
      setError("Import stopped partway — some holdings may not have saved.");
    } finally {
      setImporting(false);
    }
  }

  const includedCount = rows.filter((r) => r.included).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) onOpenChange?.(v); }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-full sm:max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Import Holdings Screenshot</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Upload a screenshot of your investment account — AI reads each holding (ticker, shares, avg price, P&L) and lets you review before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {rows.length === 0 && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className="cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-zinc-950/60 hover:border-indigo-500/50 transition-colors p-6 sm:p-8 flex flex-col items-center justify-center gap-3 text-center touch-manipulation"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="text-sm text-zinc-400 font-mono">Reading your holdings…</p>
                  </>
                ) : preview ? (
                  <img src={preview} alt="preview" className="max-h-40 rounded border border-zinc-800" />
                ) : file ? (
                  <div className="flex items-center gap-2 text-zinc-300">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-zinc-500" />
                    <div>
                      <p className="text-sm text-zinc-300">Tap to snap a photo or upload a screenshot</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5 hidden sm:block">PNG, JPG, or PDF · camera ready on mobile</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5 sm:hidden flex items-center justify-center gap-1"><Camera className="h-3 w-3" /> Camera ready</p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />

              {error && <p className="text-xs text-rose-400">{error}</p>}

              {file && !parsing && (
                <Button onClick={handleParse} className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  <UploadCloud className="h-4 w-4 mr-1.5" /> Scan with AI
                </Button>
              )}
            </>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono uppercase tracking-widest text-white/50">
                  {includedCount} holding{includedCount === 1 ? "" : "s"} ready to import · review and edit below
                </p>
                <button
                  onClick={reset}
                  disabled={importing}
                  className="text-[11px] font-mono uppercase tracking-widest text-white/40 hover:text-white disabled:opacity-40"
                >
                  Start over
                </button>
              </div>

              <div className="max-h-[44vh] overflow-y-auto space-y-2 pr-1">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 transition-colors ${
                      r.included ? "border-zinc-700 bg-zinc-950/40" : "border-zinc-800 bg-zinc-950/20 opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => updateRow(i, { included: !r.included })}
                        className={`mt-1.5 h-7 w-7 rounded border flex items-center justify-center shrink-0 ${
                          r.included ? "bg-emerald-500 border-emerald-500 text-black" : "border-zinc-600"
                        }`}
                      >
                        {r.included && <Check className="h-4 w-4" />}
                      </button>

                      <div className="flex-1 grid grid-cols-12 gap-2">
                        <div className="col-span-6 sm:col-span-3">
                          <Label className="text-[9px] text-zinc-600 uppercase tracking-wider">Ticker</Label>
                          <Input
                            value={r.symbol}
                            onChange={(e) => updateRow(i, { symbol: e.target.value.toUpperCase() })}
                            className="h-10 sm:h-8 mt-0.5 bg-zinc-950 border-zinc-800 text-sm uppercase"
                            placeholder="AAPL"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <Label className="text-[9px] text-zinc-600 uppercase tracking-wider">Shares</Label>
                          <Input
                            type="number"
                            step="any"
                            value={r.shares}
                            onChange={(e) => updateRow(i, { shares: Number(e.target.value) || 0 })}
                            className="h-10 sm:h-8 mt-0.5 bg-zinc-950 border-zinc-800 text-sm tabular-nums"
                            placeholder="10"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <Label className="text-[9px] text-zinc-600 uppercase tracking-wider">Avg Buy $</Label>
                          <Input
                            type="number"
                            step="any"
                            value={r.avg_buy_price}
                            onChange={(e) => updateRow(i, { avg_buy_price: Number(e.target.value) || 0 })}
                            className="h-10 sm:h-8 mt-0.5 bg-zinc-950 border-zinc-800 text-sm tabular-nums"
                            placeholder="150.00"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <Label className="text-[9px] text-zinc-600 uppercase tracking-wider">P&amp;L (optional)</Label>
                          <Input
                            type="number"
                            step="any"
                            value={r.pnl}
                            onChange={(e) => updateRow(i, { pnl: Number(e.target.value) || 0 })}
                            className="h-10 sm:h-8 mt-0.5 bg-zinc-950 border-zinc-800 text-sm tabular-nums"
                            placeholder="—"
                          />
                        </div>
                        <div className="col-span-8 sm:col-span-5">
                          <Label className="text-[9px] text-zinc-600 uppercase tracking-wider">Account</Label>
                          <Select value={r.account} onValueChange={(v) => updateRow(i, { account: v })}>
                            <SelectTrigger className="h-10 sm:h-8 mt-0.5 bg-zinc-950 border-zinc-800 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              {ACCOUNTS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 sm:col-span-2 flex items-end">
                          <button
                            onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                            disabled={importing}
                            className="h-10 sm:h-8 w-full rounded-md border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 flex items-center justify-center transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <Button
                onClick={handleImport}
                disabled={importing || includedCount === 0}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing… {done}/{includedCount}</>
                ) : (
                  <><Check className="h-4 w-4 mr-1.5" /> Import {includedCount} holding{includedCount === 1 ? "" : "s"}</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}