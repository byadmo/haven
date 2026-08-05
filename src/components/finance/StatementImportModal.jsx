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
import { balanceApplies, txEffect } from "@/lib/accounts";
import { useCategories, categoryOptions } from "@/lib/categories";
import { format } from "date-fns";
import { UploadCloud, Loader2, Trash2, Check, FileText, ImageIcon, X, FileCheck } from "lucide-react";
import confetti from "canvas-confetti";

const today = () => format(new Date(), "yyyy-MM-dd");

const KNOWN_CATEGORIES = [
  "Income", "Transit (GO/TTC)", "E39/Civic Maintenance", "Christ Like! Inventory",
  "Food/Groceries", "Rent", "Utilities", "Dining", "Other",
];

const CATEGORY_FROM_DESCRIPTION = [
  { test: /presto|ttc|\bgo\b|up express|transit|metrolinx|lyft|uber(\s|trip)?/i, cat: "Transit (GO/TTC)" },
  { test: /loblaws|no frills|metro|sobeys|farm boy|whole foods|costco|walmart|grocery|superstore/i, cat: "Food/Groceries" },
  { test: /mcdonald|tim horton|starbucks|subway|doordash|uber\s?eats|skipthedishes|restaurant|grill|pizza|sushi|bar\b|cafe/i, cat: "Dining" },
  { test: /payroll|salary|deposit|e-transfer in|refund|cashback|interest paid|payment received/i, cat: "Income" },
  { test: /rent|landlord|property mgmt|condo fee/i, cat: "Rent" },
  { test: /enbridge|hydro|gas co|bell|rogers|telus|toronto hydro|water utility|internet|mobile plan/i, cat: "Utilities" },
  { test: /e39|civic|mechanic|auto parts|tire|oil change|bmw|honda|toyota/i, cat: "E39/Civic Maintenance" },
  { test: /inventory|wholesale|stock\b|resale/i, cat: "Christ Like! Inventory" },
];

function guessCategory(text) {
  for (const { test, cat } of CATEGORY_FROM_DESCRIPTION) {
    if (test.test(text)) return cat;
  }
  return "Other";
}

function cleanMerchant(raw) {
  if (!raw) return "";
  let m = raw.split(/[/\\]/)[0].trim();
  m = m.replace(/\s+(appl|apple pay|google pay|gpay|stripe|sq|pty|ltd|inc|llc)\b.*/i, "").trim();
  m = m.replace(/[.,;:|]+$/, "").trim();
  return m || raw.trim();
}

function parseDate(raw) {
  if (!raw) return today();
  const s = String(raw).trim();
  const lc = s.toLowerCase();
  if (!lc || lc === "just now" || lc === "today") return today();
  if (lc === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return format(d, "yyyy-MM-dd");
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[,\s].*)?$/);
  if (m) {
    const [, mo, da, yr] = m;
    const year = yr.length === 2 ? 2000 + +yr : +yr;
    return `${year}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  return today();
}

// Parse ONLY: account/card name, transaction rows, and the current/new balance.
// Everything else (interest charts, APR/fee tables, terms pages, marketing,
// back-of-PDF info) is ignored for speed.
const EXTRACT_SCHEMA = {
  type: "object",
  description:
    "Extract ONLY the transaction rows and the current/new balance. Ignore interest rate charts, APR/fee tables, terms pages, marketing, and any non-transaction summary.",
  properties: {
    card_name: { type: "string", description: "Card or account name shown, if visible." },
    card_last4: { type: "string", description: "Last 4 digits of the card, if shown." },
    new_balance: { type: "number", description: "Current/new balance after these transactions. 0 if not visible." },
    transactions: {
      type: "array",
      description: "Every transaction row: description, amount, type, date. Skip totals and fee-detail rows.",
      items: {
        type: "object",
        properties: {
          description: { type: "string", description: "Merchant/memo text exactly as shown." },
          amount: { type: "number", description: "Absolute dollar amount as a positive number, no symbols." },
          type: { type: "string", enum: ["income", "expense"], description: "'expense' for charges/purchases/bills. 'income' for refunds/deposits/payroll." },
          date: { type: "string", description: "Date in yyyy-MM-dd. 'Today'→today, 'Yesterday'→yesterday." },
        },
        required: ["description", "amount", "type", "date"],
      },
    },
  },
  required: ["transactions"],
};

function normalizeRow(r) {
  const rawDesc = r.description || "";
  const description = cleanMerchant(rawDesc) || rawDesc;
  const amount = Math.abs(Number(r.amount) || 0);
  const type = r.type === "income" ? "income" : "expense";
  let category = r.category && KNOWN_CATEGORIES.includes(r.category) ? r.category : null;
  if (!category) category = type === "income" ? "Income" : guessCategory(description + " " + rawDesc);
  if (!KNOWN_CATEGORIES.includes(category)) category = "Other";
  return {
    description, amount, type, category,
    date: parseDate(r.date),
    account_id: "",
    source_card_name: "",
    source_card_last4: "",
    included: true,
  };
}

function autoMatchAccount(row, opts) {
  if (!opts || !opts.length) return "";
  const cand = (row.source_card_name || "").toLowerCase();
  const last4 = (row.source_card_last4 || "").replace(/\s/g, "");
  if (!cand && !last4) return "";
  let best = null;
  let bestScore = 0;
  for (const a of opts) {
    const an = (a.name || "").toLowerCase();
    let score = 0;
    if (last4 && an.includes(last4)) score += 5;
    if (cand && an.includes(cand)) score += 4;
    if (cand) {
      const ct = cand.split(/[\s\-/]+/).filter((t) => t.length > 2);
      for (const t of ct) if (an.includes(t)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = a.id; }
  }
  return best && bestScore > 0 ? best : "";
}

export default function StatementImportModal({ open, onOpenChange, accounts = [], debts = [], onSaved }) {
  const { categories } = useCategories();
  const categoryList = categoryOptions(categories);

  const [files, setFiles] = React.useState([]);
  const [previews, setPreviews] = React.useState([]);
  const [parsing, setParsing] = React.useState(false);
  const [groups, setGroups] = React.useState([]); // [{ fileName, rows: [] }]
  const [gi, setGi] = React.useState(0);
  const [error, setError] = React.useState("");
  const [importing, setImporting] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const [bulkAccountId, setBulkAccountId] = React.useState("");
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    previews.forEach((p) => p && URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setGroups([]);
    setGi(0);
    setError("");
    setDone(0);
    setBulkAccountId("");
  }

  function handleFiles(fileList) {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}_${f.size}_${f.lastModified}`));
      const added = arr.filter((f) => !seen.has(`${f.name}_${f.size}_${f.lastModified}`));
      if (!added.length) return prev;
      setPreviews((pp) => [...pp, ...added.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null))]);
      return [...prev, ...added];
    });
    setGroups([]);
    setGi(0);
    setError("");
  }

  function removeFile(i) {
    setPreviews((prev) => {
      if (prev[i]) URL.revokeObjectURL(prev[i]);
      return prev.filter((_, idx) => idx !== i);
    });
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setGroups([]);
    setGi(0);
    setError("");
  }

  const current = groups[gi];
  const rows = current?.rows || [];

  function updateRow(i, patch) {
    setGroups((gs) => gs.map((g, idx) => {
      if (idx !== gi) return g;
      const nextRows = g.rows.map((r, j) => (j === i ? { ...r, ...patch } : r));
      return { ...g, rows: nextRows };
    }));
  }

  function removeRow(i) {
    setGroups((gs) => gs.map((g, idx) => idx === gi
      ? { ...g, rows: g.rows.filter((_, j) => j !== i) }
      : g));
  }

  function applyBulkAccount() {
    if (!bulkAccountId) return;
    setGroups((gs) => gs.map((g, idx) => idx === gi
      ? { ...g, rows: g.rows.map((r) => (r.included ? { ...r, account_id: bulkAccountId } : r)) }
      : g));
  }

  async function handleParse() {
    if (!files.length || parsing) return;
    setParsing(true);
    setError("");
    setGroups([]);
    const accountOptions = [
      ...accounts.map((a) => ({ id: a.id, name: a.name, kind: "account" })),
      ...debts.map((d) => ({ id: d.id, name: d.name, kind: "debt" })),
    ];
    try {
      // Parse every file in parallel for speed.
      const results = await Promise.all(files.map(async (f) => {
        try {
          const up = await base44.integrations.Core.UploadFile({ file: f });
          const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: up.file_url,
            json_schema: EXTRACT_SCHEMA,
          });
          let list = [];
          let cardName = "";
          let cardLast4 = "";
          if (Array.isArray(res?.output)) list = res.output;
          else if (res?.output?.transactions) {
            list = res.output.transactions;
            cardName = res.output.card_name || "";
            cardLast4 = res.output.card_last4 || "";
          }
          if (!Array.isArray(list)) list = [];
          const rows = [];
          for (const r of list) {
            const n = normalizeRow(r);
            n.source_card_name = r.card_name || cardName;
            n.source_card_last4 = r.card_last4 || cardLast4;
            n.account_id = autoMatchAccount(n, accountOptions);
            if (n.description || n.amount) rows.push(n);
          }
          return { fileName: f.name, rows };
        } catch {
          return { fileName: f.name, rows: null }; // null = parse failed
        }
      }));
      const valid = results.filter((r) => r.rows && r.rows.length);
      const failed = results.filter((r) => r.rows === null);
      if (!valid.length) {
        setError(failed.length === files.length
          ? "Could not parse — AI may be busy, please retry."
          : "No transactions found in those files. Try clearer screenshots or PDFs.");
      } else {
        setGroups(valid);
        setGi(0);
        if (failed.length > 0) setError(`${failed.length} of ${files.length} file(s) could not be parsed and were skipped.`);
      }
    } catch {
      setError("Could not parse these files — AI may be busy, please retry.");
    } finally {
      setParsing(false);
    }
  }

  // Apply balance effects for a batch of transactions in as few calls as
  // possible: one get + one update per unique linked account/liability.
  async function applyBatchEffects(txs) {
    const deltas = {}; // id -> signed bank-style delta (income +, expense -)
    for (const t of txs) {
      if (!t.account_id || !balanceApplies(t.date)) continue;
      deltas[t.account_id] = (deltas[t.account_id] || 0) + txEffect(t);
    }
    const acctIds = new Set(accounts.map((a) => a.id));
    await Promise.all(Object.entries(deltas).map(async ([id, d]) => {
      if (!d) return;
      try {
        if (acctIds.has(id)) {
          const rec = await base44.entities.Account.get(id);
          await base44.entities.Account.update(id, { balance: (rec.balance || 0) + d });
        } else {
          // liability: income pays down, expense borrows more → invert the bank delta
          const rec = await base44.entities.Debt.get(id);
          await base44.entities.Debt.update(id, { current_balance: (rec.current_balance || 0) - d });
        }
      } catch { /* ignore balance update failure */ }
    }));
  }

  async function handleImport() {
    if (importing) return;
    const toCreate = rows.filter((r) => r.included && r.amount > 0);
    if (!toCreate.length) return;
    setImporting(true);
    setDone(0);
    try {
      // One bulk create instead of a per-row loop.
      await base44.entities.Transaction.bulkCreate(
        toCreate.map((r) => ({
          description: r.description,
          amount: r.amount,
          type: r.type,
          category: r.category,
          date: r.date,
          account_id: r.account_id || undefined,
        }))
      );
      await applyBatchEffects(toCreate);
      setDone(toCreate.length);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });

      // Advance to the next file's group, or finish.
      if (gi < groups.length - 1) {
        setGi(gi + 1);
        setBulkAccountId("");
        setImporting(false);
      } else {
        onSaved?.();
        onOpenChange?.(false);
      }
    } catch {
      setError("Import stopped partway — some transactions may not have saved.");
    } finally {
      setImporting(false);
    }
  }

  const accountOptions = [
    ...accounts.map((a) => ({ id: a.id, name: a.name, kind: "account" })),
    ...debts.map((d) => ({ id: d.id, name: d.name, kind: "debt" })),
  ];
  const includedCount = rows.filter((r) => r.included && r.amount > 0).length;
  const totalGroups = groups.length;
  const isLastGroup = gi >= totalGroups - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) onOpenChange?.(v); }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-full sm:max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Import Bank Statement</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Upload screenshots or PDFs — AI reads the transactions from every file. Review each file one at a time before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {groups.length === 0 && (
            <>
              <div
                onClick={() => !parsing && fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (!parsing) handleFiles(e.dataTransfer.files); }}
                className={`cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-zinc-950/60 transition-colors p-6 sm:p-8 flex flex-col items-center justify-center gap-3 text-center touch-manipulation ${parsing ? "pointer-events-none" : "hover:border-indigo-500/50"}`}
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="text-sm text-zinc-400 font-mono">
                      Reading {files.length} file{files.length === 1 ? "" : "s"}…
                      <br />
                      <span className="text-[11px] text-zinc-600">extracting transactions & balance only</span>
                    </p>
                  </>
                ) : previews.length > 0 ? (
                  <div className="w-full space-y-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      {files.map((f, i) => (
                        <div key={i} className="relative rounded-lg border border-zinc-700 bg-zinc-950/60 p-1.5 w-28 flex flex-col items-center gap-1">
                          <span className="absolute -top-1.5 -left-1.5 h-5 min-w-5 px-1 rounded-full bg-indigo-600 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-white">
                            {i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                            aria-label="Remove file"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          {previews[i] ? (
                            <img src={previews[i]} alt={f.name} className="h-20 w-full object-cover rounded" />
                          ) : (
                            <div className="h-20 w-full rounded flex items-center justify-center bg-zinc-900">
                              <FileText className="h-6 w-6 text-zinc-500" />
                            </div>
                          )}
                          <p className="text-[10px] text-zinc-400 truncate w-full text-left" title={f.name}>{f.name}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 text-center">
                      {files.length} file{files.length === 1 ? "" : "s"} ready · tap to add more
                    </p>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-zinc-500" />
                    <div>
                      <p className="text-sm text-zinc-300">Tap to upload photos or statements</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5 hidden sm:block">PNG, JPG, or PDF · pick multiple at once on mobile</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5 sm:hidden flex items-center justify-center gap-1"><ImageIcon className="h-3 w-3" /> Gallery or files · multi-select</p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
              />

              {error && <p className="text-xs text-rose-400">{error}</p>}

              {files.length > 0 && !parsing && (
                <Button onClick={handleParse} className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  <UploadCloud className="h-4 w-4 mr-1.5" /> Scan{files.length > 1 ? ` ${files.length} files` : ""} with AI
                </Button>
              )}
            </>
          )}

          {groups.length > 0 && current && (
            <>
              {/* Per-file header — file name top-left + position counter */}
              <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-white/40">File {gi + 1} of {totalGroups}</p>
                    <p className="text-sm text-zinc-100 truncate font-mono" title={current.fileName}>{current.fileName}</p>
                  </div>
                </div>
                <button
                  onClick={reset}
                  disabled={importing}
                  className="text-[11px] font-mono uppercase tracking-widest text-white/40 hover:text-white disabled:opacity-40 shrink-0"
                >
                  Start over
                </button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs font-mono uppercase tracking-widest text-white/50">
                  {includedCount} transaction{includedCount === 1 ? "" : "s"} ready to import
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                <span className="text-[10px] uppercase tracking-wider text-white/50 shrink-0">Bulk assign</span>
                <Select value={bulkAccountId || "none"} onValueChange={(v) => setBulkAccountId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-8 flex-1 min-w-[140px] bg-zinc-950 border-zinc-800 text-sm">
                    <SelectValue placeholder="Choose account" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="none">No account</SelectItem>
                    {accountOptions.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={applyBulkAccount} disabled={!bulkAccountId || importing} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  Apply to all
                </Button>
              </div>

              <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
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
                        <div className="col-span-12 sm:col-span-5">
                          <Input
                            value={r.description}
                            onChange={(e) => updateRow(i, { description: e.target.value })}
                            className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm"
                            placeholder="Description"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={r.amount}
                            onChange={(e) => updateRow(i, { amount: Number(e.target.value) || 0 })}
                            className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm tabular-nums"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <Select value={r.type} onValueChange={(v) => updateRow(i, { type: v })}>
                            <SelectTrigger className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="expense">Expense</SelectItem>
                              <SelectItem value="income">Income</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-12 sm:col-span-3">
                          <Input
                            type="date"
                            value={r.date}
                            onChange={(e) => updateRow(i, { date: e.target.value })}
                            className="h-10 sm:h-8 bg-zinc-950 border-zinc-800 text-sm"
                          />
                        </div>

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
                            onClick={() => removeRow(i)}
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
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing…</>
                ) : (
                  <><Check className="h-4 w-4 mr-1.5" /> Import {includedCount} transaction{includedCount === 1 ? "" : "s"}{!isLastGroup ? ` · next: ${groups[gi + 1].fileName}` : ""}</>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}