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
import { applyTxAccountEffect } from "@/lib/accounts";
import { useCategories, categoryOptions } from "@/lib/categories";
import { format } from "date-fns";
import { UploadCloud, Loader2, Trash2, Check, FileText, ImageIcon, Camera } from "lucide-react";
import confetti from "canvas-confetti";

const today = () => format(new Date(), "yyyy-MM-dd");

// Recognized screenshot formats (pass these hints to the model via field
// descriptions so it knows what kinds of images to expect):
//   • Apple Wallet "Transaction Detail" pages — large amount at top, merchant
//     string, "M/D/YY, H:MM AM/PM" timestamp, "Status: Approved" block, card
//     name (e.g. "Royal Bank Cashback MasterCard").
//   • Banking app "Latest Transactions" lists — a card image plus one or more
//     rounded transaction rows with merchant, amount (CA$ or $), payment
//     method (Apple Pay, etc.), and a relative time ("Just now", "Today",
//     "Yesterday", "Aug 3").
//   • Credit card / chequing statements — multi-row tables with date,
//     description, and amount columns.
//   • Single-charge push notifications or email receipts.
// Amounts may be prefixed with CA$, CDN$, USD, $, or no symbol. Relative
// dates like "Just now" map to today's date. The merchant string often
// contains a raw processor suffix (e.g. "Presto Appl/scvxd2kmd7") — extract
// the clean human-readable merchant into `merchant_clean`.
const KNOWN_CATEGORIES = [
  "Income", "Transit (GO/TTC)", "E39/Civic Maintenance", "Christ Like! Inventory",
  "Food/Groceries", "Rent", "Utilities", "Dining", "Other",
];

const MERCHANT_CATEGORY_HINTS = [
  "Presto, GO Transit, TTC, UP Express, Uber, Lyft, Transit → 'Transit (GO/TTC)'",
  "Loblaws, No Frills, Metro, Sobeys, Farm Boy, Whole Foods, Costco, Walmart grocery → 'Food/Groceries'",
  "McDonalds, Tim Hortons, Starbucks, Subway, Swigch, DoorDash, Uber Eats, Skip → 'Dining'",
  "Lula, Intel, landlord, property management, Condo → 'Rent'",
  "Enbridge, Hydro, Bell, Rogers, Telus, Toronto Hydro, water, gas, internet → 'Utilities'",
  "Payroll, salary, deposit, e-transfer in, refund, cashback reward → 'Income'",
  "Honda, Toyota, mechanic, E39, BMW, parts, Civic maintenance → 'E39/Civic Maintenance'",
  "inventory, stock, wholesale goods for resale → 'Christ Like! Inventory'",
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

// Strip raw processor suffixes like "Presto Appl/scvxd2kmd7" → "Presto"
function cleanMerchant(raw) {
  if (!raw) return "";
  let m = raw.split(/[/\\]/)[0].trim();
  m = m.replace(/\s+(appl|apple pay|google pay|gpay|stripe|sq|pty|ltd|inc|llc)\b.*/i, "").trim();
  m = m.replace(/[.,;:|]+$/, "").trim();
  return m || raw.trim();
}

// Parse many date forms → yyyy-MM-dd. Relative ("Just now", "Today",
// "Yesterday") resolve against `now`. Falls back to today.
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
  // "8/3/26, 9:52 PM"  →  2026-08-03
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

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    source_type: {
      type: "string",
      enum: ["apple_wallet_detail", "banking_app_list", "credit_card_summary", "statement_table", "receipt", "other"],
      description: "What kind of image this is. 'apple_wallet_detail' = iOS Wallet transaction detail page (large amount, merchant, date/time, Status: Approved block, card name). 'banking_app_list' = RBC/TD/Scotia/BMO/CIBC app showing a card image plus 'Latest Transactions' rows. 'credit_card_summary' = card image with one or two highlighted transactions. 'statement_table' = printed/PDF statement with date/description/amount columns. 'receipt' = store or email receipt.",
    },
    card_name: {
      type: "string",
      description: "Name of the card or account shown (e.g. 'RBC Cash Back Mastercard', 'Royal Bank Cashback MasterCard', 'TD Every Day-A'). Leave empty if not visible.",
    },
    card_last4: {
      type: "string",
      description: "Last 4 digits of the card if shown (e.g. '8615'). Leave empty otherwise.",
    },
    transactions: {
      type: "array",
      description: "Every transaction visible in the image. A single Apple Wallet detail page still yields one entry here. Parse each row even if merchant text contains a raw processor suffix like 'Presto Appl/scvxd2kmd7'.",
      items: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Original merchant/memo text exactly as shown, including any raw processor suffix (e.g. 'Presto Appl/scvxd2kmd7'). This is preserved for matching.",
          },
          merchant_clean: {
            type: "string",
            description: "Human-readable merchant name with processor suffixes removed. 'Presto Appl/scvxd2kmd7' → 'Presto'. 'TIM HORTONS 1234' → 'Tim Hortons'. Used as the display description.",
          },
          amount: {
            type: "number",
            description: "Absolute dollar amount as a positive number. Strip currency symbols and prefixes (CA$, CDN$, USD, $) and commas. E.g. 'CA$21.00' → 21.00.",
          },
          currency: {
            type: "string",
            enum: ["CAD", "USD", "other"],
            description: "Currency indicated in the image. Use 'CAD' for CA$ / CDN$ / Royal Bank, 'USD' for $ with US context.",
          },
          type: {
            type: "string",
            enum: ["income", "expense"],
            description: "'expense' for purchases, charges, bills, transit, dining. 'income' for payroll, refunds, deposits, cashback credited.",
          },
          category: {
            type: "string",
            enum: KNOWN_CATEGORIES,
            description: "Best-fit category. Hints: " + MERCHANT_CATEGORY_HINTS.join(" | ") + ". Choose the closest match; use 'Other' if none fit.",
          },
          date: {
            type: "string",
            description: "Transaction date in yyyy-MM-dd. Relative labels resolve to today's date: 'Just now' and 'Today' → today, 'Yesterday' → yesterday. '8/3/26, 9:52 PM' → 2026-08-03. If no date is visible, use today's date.",
          },
          payment_method: {
            type: "string",
            description: "Payment method if shown (e.g. 'Apple Pay', 'Google Pay', 'Tap', 'Chip'). Leave empty if not visible.",
          },
        },
        required: ["description", "amount", "type", "date"],
      },
    },
  },
  required: ["transactions"],
};

function normalizeRow(r) {
  const rawDesc = r.description || "";
  const description = r.merchant_clean || cleanMerchant(rawDesc) || rawDesc;
  const amount = Math.abs(Number(r.amount) || 0);
  const type = r.type === "income" ? "income" : "expense";
  let category = r.category && KNOWN_CATEGORIES.includes(r.category) ? r.category : null;
  if (!category) category = type === "income" ? "Income" : guessCategory(description + " " + rawDesc);
  if (!KNOWN_CATEGORIES.includes(category)) category = "Other";
  return {
    description,
    amount,
    type,
    category,
    date: parseDate(r.date),
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
        if (r.account_id) {
          await applyTxAccountEffect(r);
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