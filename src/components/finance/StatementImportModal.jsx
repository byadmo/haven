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
import { isLikelyImportDuplicate } from "@/lib/duplicates";
import { useToast } from "@/components/ui/use-toast";
import { useCategories, categoryOptions } from "@/lib/categories";
import { format } from "date-fns";
import { UploadCloud, Loader2, Trash2, Check, FileText, ImageIcon, X, FileCheck, AlertTriangle, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

const today = () => format(new Date(), "yyyy-MM-dd");

// "PAYMENT - THANK YOU" on a credit-card statement is a payment TO the card
// (a liability pay-down), not income.
function isCardPayment(text) {
  return /payment\s*-\s*thank you|payment\s*thank you|thank\s*you|paiement\s*-\s*merci|paiement\s*merci/i.test(text || "");
}

// Match the description against the user's own categories (managed in Settings).
function guessCategory(text, knownCategories) {
  const lc = (text || "").toLowerCase();
  for (const name of knownCategories || []) {
    if (name && lc.includes(name.toLowerCase())) return name;
  }
  return "";
}

function cleanMerchant(raw) {
  if (!raw) return "";
  let m = String(raw).trim();
  // Drop a second reference line (long number / phone / province code) if the
  // AI joined the merchant line with its metadata line.
  m = m.split(/\n/)[0].trim();
  // Strip asterisk-prefixed sub-identifiers and masked card digits
  // (e.g. "*SUBNAME", "*****1234", "****0806").
  m = m.replace(/\*+[A-Za-z0-9]*/g, " ");
  // Strip long numeric reference strings and phone numbers.
  m = m.replace(/\b\d{4,}\b/g, " ");
  // Strip trailing province codes (BC, ON, AB, …) and the word PHONE.
  m = m.replace(/\s+(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\b(?![A-Z])/g, " ");
  m = m.replace(/\bPHONE\b/gi, " ");
  // Strip payment-channel suffixes that follow the merchant name.
  m = m.replace(/\s+(APPLE PAY|GOOGLE PAY|GPAY|STRIPE|SQ|PTY|LTD|INC|LLC)\b.*$/i, " ");
  // Trim stray punctuation/whitespace.
  m = m.replace(/[.,;:|]+$/g, "").replace(/^[.,;:|]+/g, "").trim();
  m = m.replace(/\s+/g, " ").trim();
  return m || String(raw).trim();
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
// Build the extraction schema with the user's own category list embedded so
// the AI can auto-assign a fitting category per transaction during the single
// extraction call (no extra round-trip).
function buildSchema(categoryList = []) {
  const catHint = categoryList.length
    ? ` Pick the single best-matching category for this transaction from EXACTLY this list: ${JSON.stringify(categoryList)}. If none of them fit the description well, return an empty string.`
    : "";
  const todayStr = today();
  return {
    type: "object",
    description:
      `Extract ONLY the transaction rows and the current/new balance from this bank/credit-card statement. Today's date is ${todayStr}. Ignore interest rate charts, APR/fee tables, terms pages, marketing, and any non-transaction summary. For RBC ION Visa (and similar Canadian credit-card statements) with two date columns TRANSACTION DATE and POSTING DATE (both "MMM DD" like "DEC 29"), always use the TRANSACTION DATE as the row's date and infer the year from the statement period/statement_date. The ACTIVITY DESCRIPTION column shows the merchant on the first line; a following line with a long reference number, phone number, or province code is metadata — strip it and do not include it in the description. In the AMOUNT ($) column, values with a minus/negative sign (e.g. -$199.64) or shown as payments/credits reduce the card balance: set type to "debt_payment" (a payment/credit, NOT a purchase). Positive/unsigned amounts are purchases/charges: set type to "expense". A row like "PAYMENT - THANK YOU / PAIEMENT - MERCI" is a card payment: type "debt_payment". Exclude the "TOTAL ACCOUNT BALANCE" and "NEW BALANCE" summary rows from transactions (use NEW BALANCE for new_balance). Exclude the card-number header line (e.g. "4510 14** **** 0806 - PRIMARY"); capture its last 4 digits as card_last4. Parse ONLY the actual transaction table (columns TRANSACTION DATE / POSTING DATE / ACTIVITY DESCRIPTION / AMOUNT). Completely ignore and never return as transactions: the "AVION POINTS" box (previous points balance, points earned, bonus points, new points balance — loyalty points, not dollar amounts); any "CONTACT US" section (customer service, lost & stolen, collect outside North America phone numbers, rewards website URL); any "IMPORTANT INFORMATION" / "INTEREST AND OTHER CALCULATIONS" legal or disclosure block (Determination of Interest, Your Responsibilities, Report lost or stolen cards, Making your payment, Missed payments, interest rate charts, activity-description explanations, foreign currency conversion disclosures); text in yellow/highlighted info boxes; and any dense paragraph-style legal/regulatory text. If text is not a row in the transaction table itself, treat it as non-transactional metadata and skip it entirely — do not invent transactions or amounts from it, and do not let it affect the count.`,
    properties: {
      card_name: { type: "string", description: "Card or account name shown, if visible." },
      card_last4: { type: "string", description: "Last 4 digits of the card, if shown." },
      statement_date: { type: "string", description: `The statement issue/period date in yyyy-MM-dd if visible anywhere on the document; otherwise empty. Use it to infer the correct year for transaction dates that show only month/day.` },
      new_balance: { type: "number", description: "Current/new balance after these transactions. 0 if not visible." },
      transactions: {
        type: "array",
        description: "Every transaction row from the transaction TABLE only: description, amount, type, date, category. Skip totals, fee-detail, AVION POINTS, CONTACT US, IMPORTANT INFORMATION, and any legal/disclosure paragraph rows.",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "Merchant/memo text exactly as shown." },
            amount: { type: "number", description: "Absolute dollar amount as a positive number, no symbols." },
            type: { type: "string", enum: ["income", "expense", "debt_payment"], description: "'expense' for purchases/charges/bills. 'income' for refunds/deposits/payroll. 'debt_payment' for card payments/credits — rows whose amount is negative/credited (e.g. 'PAYMENT - THANK YOU') that reduce a credit-card balance, NOT a purchase." },
            date: { type: "string", description: `The EXACT transaction date in yyyy-MM-dd, taken from that row. If the row shows only month/day, use the year from the statement period/statement date; a date later than today (${todayStr}) means the previous calendar year. 'Today'→${todayStr}, 'Yesterday'→the day before. Never guess or invent a value; if no date is visible, use ${todayStr}.` },
            category: { type: "string", description: "The category that best fits this transaction based on its description." + catHint },
          },
          required: ["description", "amount", "type", "date"],
        },
      },
    },
    required: ["transactions"],
  };
}

function normalizeRow(r, knownCategories = []) {
  const rawDesc = r.description || "";
  const description = cleanMerchant(rawDesc) || rawDesc;
  const amount = Math.abs(Number(r.amount) || 0);
  const isPayment = isCardPayment(description + " " + rawDesc) || r.type === "debt_payment";
  const type = isPayment ? "debt_payment" : (r.type === "income" ? "income" : "expense");
  let category;
  if (isPayment) {
    category = "Debt Payment";
  } else {
    category = r.category && knownCategories.includes(r.category) ? r.category : null;
    if (!category) {
      if (type === "income" && knownCategories.includes("Income")) category = "Income";
      else category = guessCategory(description + " " + rawDesc, knownCategories);
    }
    if (category && !knownCategories.includes(category)) category = "";
  }
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
  const [existingTxns, setExistingTxns] = React.useState([]);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [failedFiles, setFailedFiles] = React.useState([]);
  const fileRef = React.useRef(null);
  const retryRef = React.useRef(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load existing transactions so we can flag duplicates during import review.
  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    base44.entities.Transaction.list("-updated_date", 5000)
      .then((t) => { if (alive) setExistingTxns(t); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open]);

  // When background parsing ends and the current index points past every
  // ready group (the user already imported the last one), close the modal.
  React.useEffect(() => {
    // Don't close if there are still failed files waiting to be re-uploaded.
    if (!parsing && groups.length > 0 && gi >= groups.length && failedFiles.length === 0) {
      onSaved?.();
      onOpenChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsing, groups.length, gi, failedFiles.length]);

  function reset() {
    previews.forEach((p) => p && URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setGroups([]);
    setGi(0);
    setError("");
    setDone(0);
    setBulkAccountId("");
    setFailedFiles([]);
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

  // Flag rows that look like duplicates: same date, name, amount and account as
  // an already-imported transaction or an earlier row in the same import batch.
  const duplicateFlags = React.useMemo(() => {
    const flags = {};
    rows.forEach((r, i) => {
      const dup = isLikelyImportDuplicate(r, existingTxns, 1) || isLikelyImportDuplicate(r, rows.slice(0, i), 1);
      if (dup) flags[i] = true;
    });
    return flags;
  }, [rows, existingTxns]);

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

  // Drop this file's rows without importing, then advance to the next file
  // (or close if it was the last one).
  function disregardFile() {
    if (importing) return;
    setGroups((gs) => gs.filter((_, idx) => idx !== gi));
    setError("");
  }

  // Re-uncheck every row detected as a duplicate of an existing or earlier row.
  function uncheckDuplicates() {
    if (importing) return;
    setGroups((gs) => gs.map((g, idx) => idx === gi
      ? { ...g, rows: g.rows.map((r, j) => (duplicateFlags[j] ? { ...r, included: false } : r)) }
      : g));
  }

  // Parse a single file into a review group. Throws on upload/extract failure
  // or when no transaction rows were found (both treated as "failed").
  async function parseOneFile(f, accountOptions, existing) {
    const up = await base44.integrations.Core.UploadFile({ file: f });
    const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: up.file_url,
      json_schema: buildSchema(categoryList),
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
      const n = normalizeRow(r, categoryList);
      n.source_card_name = r.card_name || cardName;
      n.source_card_last4 = r.card_last4 || cardLast4;
      n.account_id = autoMatchAccount(n, accountOptions);
      if (n.description || n.amount) rows.push(n);
    }
    if (!rows.length) throw new Error("no transactions");
    rows.forEach((n, idx) => {
      n.duplicate = isLikelyImportDuplicate(n, existing, 1) || isLikelyImportDuplicate(n, rows.slice(0, idx), 1);
      if (n.duplicate) n.included = false;
    });
    return { fileName: f.name, rows };
  }

  async function handleParse() {
    if (!files.length || parsing) return;
    setParsing(true);
    setError("");
    setGroups([]);
    setFailedFiles([]);
    let existing = existingTxns;
    if (!existing.length) {
      try { existing = await base44.entities.Transaction.list("-updated_date", 5000); setExistingTxns(existing); } catch { /* ignore */ }
    }
    const accountOptions = [
      ...accounts.map((a) => ({ id: a.id, name: a.name, kind: "account" })),
      ...debts.map((d) => ({ id: d.id, name: d.name, kind: "debt" })),
    ];
    const failedArr = [];
    let valid = 0;
    try {
      // Parse files one at a time, surfacing each group the moment it's ready
      // so the user can start reviewing file 1 while file 2+ keep loading.
      for (const f of files) {
        try {
          const g = await parseOneFile(f, accountOptions, existing);
          valid++;
          setGroups((gs) => [...gs, g]);
        } catch {
          failedArr.push(f);
        }
      }
      setFailedFiles(failedArr);
      if (!valid) {
        setError(failedArr.length === files.length
          ? "Could not parse — AI may be busy, please retry."
          : "No transactions found in those files. Try clearer screenshots or PDFs.");
      } else if (failedArr.length > 0) {
        setError(`${failedArr.length} of ${files.length} file(s) could not be parsed — re-upload them at the end.`);
      }
    } catch {
      setError("Could not parse these files — AI may be busy, please retry.");
    } finally {
      setParsing(false);
    }
  }

  // Re-upload path: only accept files whose name matches a previously failed
  // file, then retry parsing just those. Non-matching files are rejected.
  async function retryParseFiles(fileList) {
    const arr = Array.from(fileList || []);
    if (!arr.length || parsing) return;
    const matching = arr.filter((f) => failedFiles.some((ff) => ff.name === f.name));
    const rejected = arr.length - matching.length;
    if (rejected > 0) {
      toast({ title: "File rejected", description: `${rejected} file(s) not accepted — the file name must match a failed file.` });
    }
    if (!matching.length) return;
    setParsing(true);
    setError("");
    const matchingNames = new Set(matching.map((f) => f.name));
    setFailedFiles((prev) => prev.filter((ff) => !matchingNames.has(ff.name)));
    let existing = existingTxns;
    const accountOptions = [
      ...accounts.map((a) => ({ id: a.id, name: a.name, kind: "account" })),
      ...debts.map((d) => ({ id: d.id, name: d.name, kind: "debt" })),
    ];
    const failedAgain = [];
    let recovered = 0;
    try {
      for (const f of matching) {
        try {
          const g = await parseOneFile(f, accountOptions, existing);
          recovered++;
          setGroups((gs) => [...gs, g]);
        } catch {
          failedAgain.push(f);
        }
      }
      setFailedFiles((prev) => [...prev, ...failedAgain]);
      if (failedAgain.length === 0) {
        toast({ title: "Re-upload successful", description: `${recovered} file(s) parsed.` });
        setError("");
      } else {
        setError(`${failedAgain.length} of ${matching.length} re-uploaded file(s) still could not be parsed — try again.`);
      }
    } catch {
      setFailedFiles((prev) => [...prev, ...failedAgain]);
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

  async function commitBatch(toCreate) {
    if (!toCreate || !toCreate.length) return 0;
    const debtIds = new Set(debts.map((d) => d.id));
    const isPay = (r) => r.type === "debt_payment" && debtIds.has(r.account_id);
    const paymentRows = toCreate.filter(isPay);
    const txRows = toCreate.filter((r) => !isPay(r)).map((r) => (r.type === "debt_payment" ? { ...r, type: "expense" } : r));

    if (txRows.length) {
      await base44.entities.Transaction.bulkCreate(
        txRows.map((r) => ({
          description: r.description,
          amount: r.amount,
          type: r.type,
          category: r.category,
          date: r.date,
          account_id: r.account_id || undefined,
        }))
      );
      await applyBatchEffects(txRows);
    }

    if (paymentRows.length) {
      await base44.entities.DebtPayment.bulkCreate(
        paymentRows.map((r) => ({
          debt_id: r.account_id,
          amount: r.amount,
          date: r.date,
          note: r.description,
        }))
      );
      const payDeltas = {};
      for (const r of paymentRows) {
        if (!balanceApplies(r.date)) continue;
        payDeltas[r.account_id] = (payDeltas[r.account_id] || 0) + r.amount;
      }
      await Promise.all(Object.entries(payDeltas).map(async ([id, amt]) => {
        try {
          const rec = await base44.entities.Debt.get(id);
          const newBalance = Math.max(0, (rec.current_balance || 0) - amt);
          await base44.entities.Debt.update(id, {
            current_balance: newBalance,
            status: newBalance <= 0 ? "paid_off" : "active",
          });
        } catch { /* ignore balance update failure */ }
      }));
    }
    return toCreate.length;
  }

  // AI Auto-Approve: the user must first pick which account this file's
  // transactions go into (Bulk assign). We then send the pending review rows to
  // the deterministic backend reviewer, commit the approved rows through the
  // shared commit path (so balances stay consistent), leave the flagged rows
  // in the review list for manual override, and — when nothing was flagged —
  // automatically advance to the next file.
  async function handleAiAutoApprove() {
    if (aiBusy || importing) return;
    if (!bulkAccountId) {
      toast({ title: "Choose an account", description: "Pick which account this file's transactions go into before running AI Auto-Approve." });
      return;
    }
    const reviewRows = rows.filter((r) => r.included && r.amount > 0);
    if (!reviewRows.length) return;
    setAiBusy(true);
    try {
      // Force every reviewed row into the chosen account before reviewing.
      const preparedRows = reviewRows.map((r) => ({ ...r, account_id: bulkAccountId }));
      const pending = preparedRows.map((r) => ({
        description: r.description, amount: r.amount, type: r.type,
        date: r.date, account_id: r.account_id || "", category: r.category || "",
      }));
      const existing = existingTxns.map((t) => ({
        description: t.description || "", amount: t.amount, type: t.type || "expense",
        date: t.date, account_id: t.account_id || "",
      }));
      const res = await base44.functions.invoke("aiAutoApprove", { pending, existing });
      const data = res?.data ?? res;
      const flaggedList = Array.isArray(data?.flagged) ? data.flagged : [];
      const flaggedPendingIdx = new Set(flaggedList.map((f) => f.index));

      // Map pending positions back to row indices in the current group.
      const reviewToRowIdx = [];
      rows.forEach((r, idx) => { if (r.included && r.amount > 0) reviewToRowIdx.push(idx); });
      const rowReason = {};
      flaggedList.forEach((f) => {
        if (typeof f?.index !== "number") return;
        const rowIdx = reviewToRowIdx[f.index];
        rowReason[rowIdx] = f.reason || "Likely duplicate import";
      });
      const approvedPending = [];
      const flaggedRowIdx = [];
      reviewRows.forEach((_r, p) => {
        if (flaggedPendingIdx.has(p)) flaggedRowIdx.push(reviewToRowIdx[p]);
        else approvedPending.push(p);
      });

      const approvedRows = approvedPending.map((p) => preparedRows[p]);
      const approvedRowIdx = approvedPending.map((p) => reviewToRowIdx[p]);
      const committed = await commitBatch(approvedRows);
      onSaved?.();

      setGroups((gs) => gs.map((g, idx) => {
        if (idx !== gi) return g;
        const nextRows = [];
        g.rows.forEach((r, j) => {
          if (approvedRowIdx.includes(j)) return; // committed — drop from review
          if (flaggedRowIdx.includes(j)) {
            nextRows.push({ ...r, included: false, account_id: bulkAccountId, aiFlagReason: rowReason[j] || "Likely duplicate import" });
          } else {
            nextRows.push({ ...r, account_id: bulkAccountId });
          }
        });
        return { ...g, rows: nextRows };
      }));

      // Keep the in-memory existing list fresh so a second pass is accurate.
      setExistingTxns((prev) => [...approvedRows, ...prev]);

      if (flaggedRowIdx.length === 0) {
        // Clean file — auto-advance to the next one.
        toast({
          title: "AI Auto-Approve",
          description: `Approved and imported ${committed} transaction${committed === 1 ? "" : "s"}.`,
        });
        advanceAfterFile();
      } else {
        // Flagged rows remain for manual override — don't advance yet.
        toast({
          title: "AI Auto-Approve",
          description: `Approved ${committed}, flagged ${flaggedRowIdx.length} as likely duplicate${flaggedRowIdx.length === 1 ? "" : "s"}. Review flagged rows, then Import or Disregard.`,
        });
      }
    } catch {
      toast({ title: "AI Auto-Approve failed", description: "Please try again." });
    } finally {
      setAiBusy(false);
    }
  }

  // Advance to the next group after a file is fully handled. If another group
  // is ready (or still parsing in the background), move to it; otherwise, when
  // there are failed files waiting, park past the end so the failed-files
  // re-upload panel shows instead of closing the modal.
  function advanceAfterFile() {
    const moreReady = gi + 1 < groups.length;
    const moreComing = parsing;
    if (moreReady || moreComing) {
      setGi(gi + 1);
      setBulkAccountId("");
    } else if (failedFiles.length > 0) {
      setGi(gi + 1);
      setBulkAccountId("");
    } else {
      onSaved?.();
      onOpenChange?.(false);
    }
  }

  async function handleImport() {
    if (importing) return;
    const toCreate = rows.filter((r) => r.included && r.amount > 0);
    if (!toCreate.length) return;
    setImporting(true);
    setDone(0);
    try {
      const count = await commitBatch(toCreate);

      setDone(count);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });

      advanceAfterFile();
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
  const hasDuplicates = Object.keys(duplicateFlags).length > 0;
  const totalFiles = files.length;
  const showFailed = failedFiles.length > 0 && !parsing && !current;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) onOpenChange?.(v); }}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-full sm:max-w-3xl w-full p-0">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50">Import Bank Statement</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Upload screenshots or PDFs — AI reads the transactions from every file. Review each file one at a time before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {groups.length === 0 && !showFailed && (
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
                    <p className="text-[10px] uppercase tracking-wider text-white/40">File {gi + 1} of {totalFiles}</p>
                    <p className="text-sm text-zinc-100 truncate font-mono" title={current.fileName}>{current.fileName}</p>
                    {rows.length > 0 && (() => {
                      const ds = rows.map((r) => r.date).filter(Boolean).sort();
                      if (!ds.length) return null;
                      const label = ds[ds.length - 1] !== ds[0] ? `${ds[0]} \u2192 ${ds[ds.length - 1]}` : ds[0];
                      return <p className="text-[10px] text-white/30 font-mono truncate">{label}</p>;
                    })()}
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

              {/* Quick actions at the very top of the list */}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={disregardFile} disabled={importing} className="flex-1 h-10 border-zinc-800 text-zinc-300 hover:text-rose-400 hover:border-rose-500/40">
                  <X className="h-4 w-4 mr-1.5" /> Disregard
                </Button>
                <Button variant="outline" onClick={handleAiAutoApprove} disabled={aiBusy || importing || includedCount === 0} className="flex-1 h-10 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/60">
                  {aiBusy
                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> AI reviewing…</>
                    : <><Sparkles className="h-4 w-4 mr-1.5" /> AI Auto-Approve</>}
                </Button>
                <Button onClick={handleImport} disabled={importing || includedCount === 0} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  {importing
                    ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing…</>
                    : <><Check className="h-4 w-4 mr-1.5" /> Import {includedCount} transaction{includedCount === 1 ? "" : "s"}</>}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-mono uppercase tracking-widest text-white/50">
                  {includedCount} transaction{includedCount === 1 ? "" : "s"} ready to import
                </p>
                {hasDuplicates && (
                  <Button size="sm" variant="outline" onClick={uncheckDuplicates} disabled={importing} className="h-7 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Uncheck duplicates
                  </Button>
                )}
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

              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 transition-colors ${
                      duplicateFlags[i] || r.aiFlagReason
                        ? `border-amber-500/40 bg-amber-500/10 ${r.included ? "" : "opacity-60"}`
                        : r.included
                          ? "border-zinc-700 bg-zinc-950/40"
                          : "border-zinc-800 bg-zinc-950/20 opacity-50"
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
                        {(duplicateFlags[i] || r.aiFlagReason) && (
                          <div className="col-span-12 mb-1 flex items-center gap-1.5" title={r.aiFlagReason || "Possible duplicate — already exists in your transaction log"}>
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">
                              <AlertTriangle className="h-3 w-3" /> {r.aiFlagReason ? "AI flagged" : "Possible duplicate"}
                            </span>
                            <span className="text-[10px] text-amber-400/80">{r.aiFlagReason || "already exists — unchecked by default"}</span>
                          </div>
                        )}
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
                              <SelectItem value="debt_payment">Debt Payment</SelectItem>
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
            </>
          )}

          {groups.length > 0 && !current && parsing && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-zinc-400 font-mono">Reading the next file…</p>
            </div>
          )}

          {showFailed && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-xs uppercase tracking-widest text-amber-400/80">Failed to parse</p>
                <p className="text-sm text-zinc-200 mt-1">Re-upload each file by the same name — only matching file names are accepted, then we retry automatically.</p>
                <ul className="mt-3 space-y-1.5">
                  {failedFiles.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-amber-300 font-mono truncate">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate" title={f.name}>{f.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div
                onClick={() => !parsing && retryRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (!parsing) retryParseFiles(e.dataTransfer.files); }}
                className={`cursor-pointer rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 transition-colors p-5 flex flex-col items-center justify-center gap-2 text-center touch-manipulation ${parsing ? "pointer-events-none" : "hover:border-amber-500/60"}`}
              >
                {parsing ? (
                  <><Loader2 className="h-6 w-6 text-amber-400 animate-spin" /><p className="text-xs text-zinc-400 font-mono">Retrying…</p></>
                ) : (
                  <>
                    <UploadCloud className="h-6 w-6 text-amber-400" />
                    <p className="text-sm text-zinc-300">Re-upload failed files</p>
                    <p className="text-[11px] text-zinc-600">File name must match a failed file above</p>
                  </>
                )}
              </div>
              <input
                ref={retryRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => { retryParseFiles(e.target.files); e.target.value = ""; }}
              />
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <Button variant="outline" onClick={reset} disabled={parsing} className="w-full h-10 border-zinc-800 text-zinc-300 hover:text-white">
                Start over
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}