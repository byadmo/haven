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
import { adjustLinkedBalance, txEffect, balanceApplies } from "@/lib/accounts";
import { useCategories, categoryOptions } from "@/lib/categories";
import { format } from "date-fns";
import { UploadCloud, Loader2, Trash2, Check, FileText, ImageIcon, Camera } from "lucide-react";
import confetti from "canvas-confetti";

const today = () => format(new Date(), "yyyy-MM-dd");

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string", description: "Merchant or memo text" },
          amount: { type: "number", description: "Absolute dollar amount (always positive)" },
          type: { type: "string", enum: ["income", "expense"] },
          category: { type: "string", description: "A reasonable category guess" },
          date: { type: "string", description: "yyyy-MM-dd transaction date" },
        },
        required: ["description", "amount", "type", "date"],
      },
    },
  },
};

function normalizeRow(r) {
  return {
    description: r.description || "",
    amount: Number(r.amount) || 0,
    type: r.type === "income" ? "income" : "expense",
    category: r.category || "Other",
    date: r.date || today(),
    account_id: "",
    included: true,
  };
}

export default function StatementImportModal({ open, onOpenChange, accounts = [], debts = [], onSaved }) {
  const { categories } = useCategories();
  const categoryList = categoryOptions(categories);

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
      else if (res?.output?.transactions) list = res.output.transactions;
      if (!Array.isArray(list)) list = [];
      const norm = list.map(normalizeRow).filter((r) => r.description || r.amount);
      if (!norm.length) {
        setError("No transactions found in this file. Try a clearer screenshot or PDF.");
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
    const toCreate = rows.filter((r) => r.included && r.amount > 0);
    if (!toCreate.length) return;
    setImporting(true);
    setDone(0);
    try {
      for (const r of toCreate) {
        await base44.entities.Transaction.create({
          description: r.description,
          amount: r.amount,
          type: r.type,
          category: r.category,
          date: r.date,
          account_id: r.account_id || undefined,
        });
        if (r.account_id && balanceApplies(r.date)) {
          await adjustLinkedBalance(r.account_id, txEffect(r));
        }
        setDone((d) => d + 1);
      }
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      onSaved?.();
      onOpenChange?.(false);
    } catch (e) {
      setError("Import stopped partway — some transactions may not have saved.");
    } finally {
      setImporting(false);
    }
  }

  const accountOptions = [
    ...accounts.map((a) => ({ id: a.id, name: a.name, kind: "account" })),
    ...debts.map((d) => ({ id: d.id, name: d.name, kind: "debt" })),
  ];

  const includedCount = rows.filter((r) => r.included).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) onOpenChange?.(v); }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-full sm:max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Import Bank Statement</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Upload a screenshot or PDF — AI reads each transaction and lets you fix category, account, and type before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {/* Upload zone */}
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
                    <p className="text-sm text-zinc-400 font-mono">Reading your statement…</p>
                  </>
                ) : preview ? (
                  <img src={preview} alt="preview" className="max-h-40 rounded border border-zinc-800" />
                ) : file ? (
                  <div className="flex items-center gap-2 text-zinc-300">
                    {file.type.startsWith("image/") ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                    <span className="text-sm">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-zinc-500" />
                    <div>
                      <p className="text-sm text-zinc-300">Tap to snap a photo or upload a statement</p>
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

          {/* Parsed rows */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono uppercase tracking-widest text-white/50">
                  {includedCount} transaction{includedCount === 1 ? "" : "s"} ready to import
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
                        {/* description */}
                        <div className="col-span-12 sm:col-span-5">
                          <Input
                            value={r.description}
                            onChange={(e) => updateRow(i, { description: e.target.value })}
                            className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm"
                            placeholder="Description"
                          />
                        </div>
                        {/* amount */}
                        <div className="col-span-6 sm:col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={r.amount}
                            onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
                            className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm tabular-nums"
                          />
                        </div>
                        {/* type */}
                        <div className="col-span-6 sm:col-span-2">
                          <Select value={r.type} onValueChange={(v) => updateRow(i, { type: v })}>
                            <SelectTrigger className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {/* date */}
                        <div className="col-span-12 sm:col-span-3">
                          <Input
                            type="date"
                            value={r.date}
                            onChange={(e) => updateRow(i, { date: e.target.value })}
                            className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm"
                          />
                        </div>

                        {/* category + account row */}
                        <div className="col-span-12 sm:col-span-4">
                          <Label className="text-[9px] text-zinc-600 uppercase tracking-wider">Category</Label>
                          <input
                            list={`cats-${i}`}
                            value={r.category}
                            onChange={(e) => updateRow(i, { category: e.target.value })}
                            className="w-full h-10 sm:h-8 mt-0.5 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm outline-none focus:border-indigo-500/60"
                            placeholder="Category"
                          />
                          <datalist id={`cats-${i}`}>
                            {categoryList.map((c) => <option key={c} value={c} />)}
                          </datalist>
                        </div>
                        <div className="col-span-8 sm:col-span-5">
                          <Label className="text-[9px] text-zinc-600 uppercase tracking-wider">Account</Label>
                          <Select value={r.account_id || "none"} onValueChange={(v) => updateRow(i, { account_id: v === "none" ? "" : v })}>
                            <SelectTrigger className="h-10 sm:h-8 mt-0.5 bg-zinc-950 border-zinc-800 text-sm">
                              <SelectValue placeholder="No account" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="none">No account</SelectItem>
                              {accountOptions.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 sm:col-span-3 flex items-end">
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
                  <><Check className="h-4 w-4 mr-1.5" /> Import {includedCount} transaction{includedCount === 1 ? "" : "s"}</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}