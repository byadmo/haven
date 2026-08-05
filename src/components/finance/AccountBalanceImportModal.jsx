import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { UploadCloud, Loader2, Check, Camera, ScanLine, Building2, Plus, X, CreditCard } from "lucide-react";

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    source_type: {
      type: "string",
      enum: ["balance_snapshot", "apple_wallet_detail", "banking_app_list", "credit_card_summary", "statement_table", "receipt", "not_financial"],
      description: "What kind of image this is. 'balance_snapshot' = a screen showing a current balance (e.g. an RBC account page with '$621.77 Balance'), or a 'Current Balance / Outstanding Balance' field on a credit card. 'apple_wallet_detail' = iOS Wallet transaction detail page (large amount, merchant, 'Status: Approved' block, card name, NO current balance). 'banking_app_list' = RBC/TD/Scotia app showing a card image with one or more 'Latest Transactions' rows (may or may not show balance). 'credit_card_summary' = card image with highlighted transactions, no balance. 'statement_table' = printed/PDF statement with date/description/amount columns. 'receipt' = store or email receipt. 'not_financial' = no financial data visible.",
    },
    card_name: {
      type: "string",
      description: "Name of the card or account shown in the image (e.g. 'RBC Cash Back Mastercard', 'Royal Bank Cashback MasterCard', 'TD Every Day-A'). Returns empty if no card/account name is visible. Used to pre-fill an account match even when no balance is present.",
    },
    card_last4: {
      type: "string",
      description: "Last 4 digits of the card if shown (e.g. '8615'). Leave empty otherwise.",
    },
    accounts: {
      type: "array",
      description: "Every account/card detected in the image WITH A CURRENT BALANCE. If the image is an Apple Wallet transaction detail or a banking 'Latest Transactions' list that does NOT display a current balance, leave this array empty — do not invent a balance from a transaction amount. Transaction amounts are NOT balances.",
      items: {
        type: "object",
        properties: {
          account_name: { type: "string", description: "The name of the financial account or card (e.g. 'RBC Chequing', 'TD Savings', 'Scotia Momentum Visa', 'RBC Cash Back Mastercard', 'CIBC Line of Credit', 'BMO Mortgage')" },
          balance: {
            type: "number",
            description: "The CURRENT balance amount shown for this account. For credit cards and loans this is the outstanding/current balance owed (positive number). Strip currency symbols and prefixes (CA$, CDN$, USD, $) and commas. E.g. 'Outstanding Balance CA$621.77' → 621.77. If no current balance field is visible (only a single transaction amount), do NOT include this account — there is no balance to read.",
          },
          credit_limit: {
            type: "number",
            description: "The CREDIT LIMIT (total limit) if shown (mostly for credit cards / lines of credit). E.g. 'Credit Limit 500.00' → 500. Strip currency symbols/commas. Leave empty/null if not shown.",
          },
          available_credit: {
            type: "number",
            description: "The AVAILABLE CREDIT amount if shown — how much credit is unused. E.g. 'Available Credit $389.69' → 389.69. Strip currency symbols/commas. Leave empty/null if not shown.",
          },
          account_type: {
            type: "string",
            enum: ["chequing", "savings", "credit_card", "line_of_credit", "loan", "mortgage", "investment", "other"],
            description: "Account type. Use 'credit_card' for any credit card (Visa, Mastercard, Amex), 'line_of_credit' for lines of credit, 'loan' for personal/auto loans, 'mortgage' for mortgages, 'chequing'/'savings' for deposit accounts.",
          },
        },
        required: ["account_name", "balance", "account_type"],
      },
    },
  },
};

const TX_ONLY_SOURCE = new Set(["apple_wallet_detail", "banking_app_list", "credit_card_summary", "receipt"]);

const LIABILITY_TYPES = new Set(["credit_card", "line_of_credit", "loan", "mortgage"]);
const isLiabilityType = (t) => LIABILITY_TYPES.has(t);

const fmt = (v) => (v || 0).toLocaleString(undefined, {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export default function AccountBalanceImportModal({ open, onOpenChange, accounts = [], debts = [], onSaved }) {
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [parsing, setParsing] = React.useState(false);
  const [parsed, setParsed] = React.useState(null);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [mode, setMode] = React.useState("existing");
  const [selectedAccountId, setSelectedAccountId] = React.useState("");
  const [newAccountName, setNewAccountName] = React.useState("");
  const [newAccountType, setNewAccountType] = React.useState("chequing");
  const [balance, setBalance] = React.useState("");
  const [multiParsed, setMultiParsed] = React.useState(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setParsing(false);
    setParsed(null);
    setError("");
    setSaving(false);
    setMode("existing");
    setSelectedAccountId("");
    setNewAccountName("");
    setNewAccountType("chequing");
    setBalance("");
    setMultiParsed(null);
  }

  function handleFile(f) {
    if (!f) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setParsed(null);
    setError("");
  }

  async function handleParse() {
    if (!file || parsing) return;
    setParsing(true);
    setError("");
    setParsed(null);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: up.file_url,
        json_schema: EXTRACT_SCHEMA,
      });
      const out = res?.output;
      const srcType = out?.source_type || "";
      const cardName = out?.card_name || "";

      let items = Array.isArray(out?.accounts)
        ? out.accounts
        : out?.account_name != null
          ? [{ account_name: out.account_name, balance: out.balance, account_type: out.account_type || "other" }]
          : [];

      // Apple Wallet detail and banking 'Latest Transactions' screens show a
      // single charge, not a balance. No amount to update here — point the
      // user to the Bank Statement importer instead of showing a confusing
      // 'could not read' error.
      if (items.length === 0 && TX_ONLY_SOURCE.has(srcType) && cardName) {
        setError(
          "This image shows a transaction on \"" + cardName + "\", but no current balance. " +
          "Use 'Import Bank Statement' to log transactions instead."
        );
        setParsing(false);
        return;
      }
      if (items.length === 0 && TX_ONLY_SOURCE.has(srcType)) {
        setError("This image shows a transaction, not a balance — use 'Import Bank Statement' to log it.");
        setParsing(false);
        return;
      }
      if (items.length === 0 && srcType === "not_financial") {
        setError("No balance or card could be detected in this image.");
        setParsing(false);
        return;
      }
      if (items.length === 0 && cardName) {
        setError("Detected \"" + cardName + "\", but no balance is shown. Capture an account summary page that shows the current balance, then retry.");
        setParsing(false);
        return;
      }

      if (items.length === 1) {
        const accountName = items[0].account_name || "";
        const atype = items[0].account_type || "other";
        const liability = isLiabilityType(atype);
        const creditLimit = Number(items[0].credit_limit);
        const availCredit = Number(items[0].available_credit);
        let bal;
        let balSource = "stated";
        if (!isNaN(creditLimit) && !isNaN(availCredit)) {
          bal = creditLimit - availCredit;
          balSource = "computed";
        } else {
          bal = Number(items[0].balance) || 0;
        }
        setParsed({
          account_name: accountName, balance: bal, account_type: atype, isLiability: liability,
          balSource,
          creditLimit: isNaN(creditLimit) ? null : creditLimit,
          availCredit: isNaN(availCredit) ? null : availCredit,
        });
        setBalance(String(bal));
        setNewAccountName(accountName);
        const pool = liability ? debts : accounts;
        const match = pool.find(
          (a) => a.name.toLowerCase().includes(accountName.toLowerCase()) ||
                 accountName.toLowerCase().includes(a.name.toLowerCase())
        );
        if (match) {
          setMode("existing");
          setSelectedAccountId(match.id);
        } else if (pool.length > 0) {
          setMode("existing");
          setSelectedAccountId("");
        } else {
          setMode("new");
        }
      } else if (items.length > 1) {
        setParsed({ account_name: "", balance: 0 });
        setMultiParsed(items.map((item) => {
          const name = item.account_name || "";
          const atype = item.account_type || "other";
          const liability = isLiabilityType(atype);
          const pool = liability ? debts : accounts;
          const match = pool.find(
            (a) => a.name.toLowerCase().includes(name.toLowerCase()) ||
                   name.toLowerCase().includes(a.name.toLowerCase())
          );
          const creditLimit = Number(item.credit_limit);
          const availCredit = Number(item.available_credit);
          let bal;
          let balSource = "stated";
          if (!isNaN(creditLimit) && !isNaN(availCredit)) {
            bal = creditLimit - availCredit;
            balSource = "computed";
          } else {
            bal = Number(item.balance) || 0;
          }
          return {
            account_name: name,
            balance: bal,
            account_type: atype,
            isLiability: liability,
            balSource,
            creditLimit: isNaN(creditLimit) ? null : creditLimit,
            availCredit: isNaN(availCredit) ? null : availCredit,
            editedBalance: String(bal),
            matchedAccountId: match?.id || "",
            dismissed: false,
          };
        }));
      } else {
        setError("Could not read account name or balance from this image. Try a clearer screenshot.");
      }
    } catch (e) {
      setError("Could not parse this image — AI may be busy, please retry.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    const bal = parseFloat(balance);
    if (isNaN(bal)) { setError("Enter a valid balance amount."); return; }
    setSaving(true);
    setError("");
    try {
      if (parsed?.isLiability) {
        if (mode === "existing") {
          if (!selectedAccountId) { setError("Select a liability to update."); setSaving(false); return; }
          await base44.entities.Debt.update(selectedAccountId, { current_balance: bal });
        } else {
          if (!newAccountName.trim()) { setError("Enter a name."); setSaving(false); return; }
          await base44.entities.Debt.create({ name: newAccountName.trim(), current_balance: bal });
        }
      } else if (mode === "existing") {
        if (!selectedAccountId) { setError("Select an account to update."); setSaving(false); return; }
        await base44.entities.Account.update(selectedAccountId, { balance: bal });
      } else {
        if (!newAccountName.trim()) { setError("Enter an account name."); setSaving(false); return; }
        await base44.entities.Account.create({
          name: newAccountName.trim(),
          type: newAccountType,
          balance: bal,
        });
      }
      onSaved?.();
      onOpenChange?.(false);
    } catch (e) {
      setError("Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  function dismissMultiItem(idx) {
    setMultiParsed((prev) => prev.map((it, i) => i === idx ? { ...it, dismissed: !it.dismissed } : it));
  }

  function updateMultiBalance(idx, val) {
    setMultiParsed((prev) => prev.map((it, i) => i === idx ? { ...it, editedBalance: val } : it));
  }

  function updateMultiAccount(idx, accId) {
    setMultiParsed((prev) => prev.map((it, i) => i === idx ? { ...it, matchedAccountId: accId } : it));
  }

  async function handleMultiSave() {
    if (saving) return;
    const active = (multiParsed || []).filter((it) => !it.dismissed);
    if (active.length === 0) { setError("No accounts selected to update."); return; }
    for (const it of active) {
      if (isNaN(parseFloat(it.editedBalance))) { setError(`Invalid balance for "${it.account_name}".`); return; }
    }
    setSaving(true);
    setError("");
    try {
      for (const it of active) {
        const bal = parseFloat(it.editedBalance);
        if (it.isLiability) {
          if (it.matchedAccountId) {
            await base44.entities.Debt.update(it.matchedAccountId, { current_balance: bal });
          } else {
            await base44.entities.Debt.create({ name: it.account_name.trim() || "Scanned Card", current_balance: bal });
          }
        } else {
          if (it.matchedAccountId) {
            await base44.entities.Account.update(it.matchedAccountId, { balance: bal });
          } else {
            await base44.entities.Account.create({ name: it.account_name.trim() || "Scanned Account", type: "chequing", balance: bal });
          }
        }
      }
      onSaved?.();
      onOpenChange?.(false);
    } catch (e) {
      setError("Could not save all accounts — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange?.(v); }}>
      <DialogContent className="bg-black border-white/10 text-zinc-100 max-w-md p-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-50 flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-emerald-400" /> Scan Account Balance
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Upload a screenshot or PDF of your bank balance — AI reads the account name and amount.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {!parsed && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
                className="cursor-pointer rounded-lg border border-dashed border-zinc-700 bg-black hover:border-emerald-500/50 transition-colors p-6 flex flex-col items-center justify-center gap-3 text-center touch-manipulation"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                    <p className="text-sm text-zinc-400 font-mono">Reading your balance…</p>
                  </>
                ) : preview ? (
                  <img src={preview} alt="preview" className="max-h-40 rounded border border-zinc-800" />
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-zinc-500" />
                    <div>
                      <p className="text-sm text-zinc-300">Upload a screenshot or PDF of your balance</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5 flex items-center justify-center gap-1">
                        <UploadCloud className="h-3 w-3" /> PNG, JPG, or PDF
                      </p>
                    </div>
                  </>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />

              {error && <p className="text-xs text-rose-400">{error}</p>}

              {file && !parsing && (
                <Button onClick={handleParse} className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  <ScanLine className="h-4 w-4 mr-1.5" /> Scan with AI
                </Button>
              )}
            </>
          )}

          {parsed && !multiParsed && (
            <>
              <div className={`rounded-lg border p-3.5 flex items-center gap-3 ${parsed.isLiability ? "border-rose-500/20 bg-rose-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${parsed.isLiability ? "bg-rose-500/15" : "bg-emerald-500/15"}`}>
                  {parsed.isLiability ? <CreditCard className="h-5 w-5 text-rose-400" /> : <Building2 className="h-5 w-5 text-emerald-400" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] uppercase tracking-widest ${parsed.isLiability ? "text-rose-400/60" : "text-emerald-400/60"}`}>{parsed.isLiability ? "Detected · Liability" : "Detected"}</p>
                  <p className="text-sm font-medium text-zinc-100 truncate">{parsed.account_name || "Unknown account"}</p>
                  <p className={`text-lg font-bold font-mono tabular-nums ${parsed.isLiability ? "text-rose-400" : "text-emerald-400"}`}>{fmt(parsed.balance)}</p>
                  {parsed.balSource === "computed" && parsed.creditLimit != null && parsed.availCredit != null && (
                    <p className="text-[10px] font-mono tabular-nums text-white/40 mt-0.5">
                      {fmt(parsed.creditLimit)} limit − {fmt(parsed.availCredit)} available
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">
                  Is this an existing {parsed.isLiability ? "liability" : "account"} or a new one?
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("existing")}
                    disabled={accounts.length === 0}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                      mode === "existing"
                        ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                        : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" /> Existing
                  </button>
                  <button
                    onClick={() => setMode("new")}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-medium transition-colors ${
                      mode === "new"
                        ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                        : "border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" /> New Account
                  </button>
                </div>
              </div>

              {mode === "existing" && (
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">
                    Select {parsed.isLiability ? "liability" : "account"}
                  </Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="bg-black border-white/10 text-zinc-100">
                      <SelectValue placeholder={`Choose a ${parsed.isLiability ? "liability" : "account"}…`} />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      {(parsed.isLiability ? debts : accounts).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} <span className="text-white/40 ml-1">({fmt((parsed.isLiability ? a.current_balance : a.balance) || 0)})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {mode === "new" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">
                      {parsed.isLiability ? "Liability name" : "Account name"}
                    </Label>
                    <Input
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder={parsed.isLiability ? "e.g. Scotia Momentum Visa" : "Account name"}
                      className="bg-black border-white/10 text-zinc-100"
                    />
                  </div>
                  {!parsed.isLiability && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">
                        Account type
                      </Label>
                      <Select value={newAccountType} onValueChange={setNewAccountType}>
                        <SelectTrigger className="bg-black border-white/10 text-zinc-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-white/10">
                          <SelectItem value="chequing">Chequing</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">
                  {mode === "existing" ? "Set new balance to" : "Starting balance"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="bg-black border-white/10 text-zinc-100 text-lg font-mono tabular-nums"
                />
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={saving}
                  className="flex-1 border-white/10 text-white/70 hover:text-white hover:border-white/30"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>
                  ) : (
                    <><Check className="h-4 w-4 mr-1.5" /> {mode === "existing" ? "Update Balance" : parsed.isLiability ? "Create Liability" : "Create Account"}</>
                  )}
                </Button>
              </div>
            </>
          )}

          {multiParsed && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Check className="h-4 w-4 text-emerald-400" />
                <p className="text-[10px] uppercase tracking-widest text-white/50">
                  {multiParsed.filter((i) => !i.dismissed).length} of {multiParsed.length} accounts selected
                </p>
              </div>
              {multiParsed.map((item, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-3 transition-opacity ${
                    item.dismissed ? "opacity-30 border-white/5" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.isLiability ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
                        {item.isLiability ? <CreditCard className="h-4 w-4 text-rose-400" /> : <Building2 className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{item.account_name || "Unknown account"}</p>
                        <p className="text-[10px] font-mono tabular-nums text-white/40">{item.isLiability ? "Liability" : "Detected"}: {fmt(item.balance)}</p>
                        {item.balSource === "computed" && item.creditLimit != null && item.availCredit != null && (
                          <p className="text-[9px] font-mono tabular-nums text-white/30">{fmt(item.creditLimit)} − {fmt(item.availCredit)} avail</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dismissMultiItem(idx)}
                      className="h-7 w-7 rounded-md flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {!item.dismissed && (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.editedBalance}
                        onChange={(e) => updateMultiBalance(idx, e.target.value)}
                        className="bg-black border-white/10 text-zinc-100 text-base font-mono tabular-nums mb-2"
                      />
                      {(item.isLiability ? debts : accounts).length > 0 && (
                        <Select
                          value={item.matchedAccountId}
                          onValueChange={(v) => updateMultiAccount(idx, v)}
                        >
                          <SelectTrigger className="bg-black border-white/10 text-zinc-100 h-8">
                            <SelectValue placeholder={`Match to ${item.isLiability ? "liability" : "account"}…`} />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white/10">
                            {(item.isLiability ? debts : accounts).map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name} <span className="text-white/40 ml-1">({fmt((item.isLiability ? a.current_balance : a.balance) || 0)})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  )}
                </div>
              ))}
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={reset}
                  disabled={saving}
                  className="flex-1 border-white/10 text-white/70 hover:text-white hover:border-white/30"
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleMultiSave}
                  disabled={saving}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>
                  ) : (
                    <><Check className="h-4 w-4 mr-1.5" /> Confirm Updates</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}