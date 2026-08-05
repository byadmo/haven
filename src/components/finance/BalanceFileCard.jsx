import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, Building2, Plus, X, CreditCard, FileText, AlertCircle } from "lucide-react";

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

export default function BalanceFileCard({ entryId, file, initialPreview, accounts = [], debts = [], onSaved, onRemove, onDone }) {
  const [preview, setPreview] = React.useState(initialPreview || null);
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
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      await runParse();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runParse() {
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

      if (items.length === 0 && TX_ONLY_SOURCE.has(srcType) && cardName) {
        setError("This image shows a transaction on \"" + cardName + "\", but no current balance. Use 'Import Bank Statement' to log it.");
        setParsing(false);
        return;
      }
      if (items.length === 0 && TX_ONLY_SOURCE.has(srcType)) {
        setError("This image shows a transaction, not a balance — use 'Import Bank Statement' to log it.");
        setParsing(false);
        return;
      }
      if (items.length === 0 && srcType === "not_financial") {
        setError("No balance or card could be detected in this file.");
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
        setParsed({ account_name: accountName, balance: bal, account_type: atype, isLiability: liability, balSource, creditLimit: isNaN(creditLimit) ? null : creditLimit, availCredit: isNaN(availCredit) ? null : availCredit });
        setBalance(String(bal));
        setNewAccountName(accountName);
        const pool = liability ? debts : accounts;
        const match = pool.find((a) => a.name.toLowerCase().includes(accountName.toLowerCase()) || accountName.toLowerCase().includes(a.name.toLowerCase()));
        if (match) { setMode("existing"); setSelectedAccountId(match.id); }
        else if (pool.length > 0) { setMode("existing"); setSelectedAccountId(""); }
        else { setMode("new"); }
      } else if (items.length > 1) {
        setParsed({ account_name: "", balance: 0 });
        setMultiParsed(items.map((item) => {
          const name = item.account_name || "";
          const atype = item.account_type || "other";
          const liability = isLiabilityType(atype);
          const pool = liability ? debts : accounts;
          const match = pool.find((a) => a.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(a.name.toLowerCase()));
          const creditLimit = Number(item.credit_limit);
          const availCredit = Number(item.available_credit);
          let bal;
          let balSource = "stated";
          if (!isNaN(creditLimit) && !isNaN(availCredit)) { bal = creditLimit - availCredit; balSource = "computed"; }
          else { bal = Number(item.balance) || 0; }
          return {
            account_name: name, balance: bal, account_type: atype, isLiability: liability, balSource,
            creditLimit: isNaN(creditLimit) ? null : creditLimit, availCredit: isNaN(availCredit) ? null : availCredit,
            editedBalance: String(bal), matchedAccountId: match?.id || "", dismissed: false,
          };
        }));
      } else {
        setError("Could not read account name or balance from this file. Try a clearer screenshot.");
      }
    } catch (e) {
      setError("Could not parse this file — AI may be busy, please retry.");
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
        await base44.entities.Account.create({ name: newAccountName.trim(), type: newAccountType, balance: bal });
      }
      onSaved?.();
      setDone(true);
      onDone?.();
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
          if (it.matchedAccountId) await base44.entities.Debt.update(it.matchedAccountId, { current_balance: bal });
          else await base44.entities.Debt.create({ name: it.account_name.trim() || "Scanned Card", current_balance: bal });
        } else {
          if (it.matchedAccountId) await base44.entities.Account.update(it.matchedAccountId, { balance: bal });
          else await base44.entities.Account.create({ name: it.account_name.trim() || "Scanned Account", type: "chequing", balance: bal });
        }
      }
      onSaved?.();
      setDone(true);
      onDone?.();
    } catch (e) {
      setError("Could not save all accounts — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const fileName = file?.name || "file";

  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 bg-white/5 text-white/40">
          {file?.type?.startsWith("image/") && preview ? (
            <img src={preview} alt="preview" className="h-9 w-9 object-cover rounded-md" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-200 truncate">{fileName}</p>
          {parsing && <p className="text-[10px] text-white/40 font-mono">Reading balance…</p>}
        </div>
        <button
          onClick={() => onRemove?.(entryId)}
          disabled={saving || parsing}
          className="h-7 w-7 rounded-md flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 shrink-0 disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-rose-400">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!done && parsing && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
          <p className="text-[11px] text-white/50 font-mono">Extracting balance with AI…</p>
        </div>
      )}

      {!done && parsed && !multiParsed && (
        <>
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${parsed.isLiability ? "border-rose-500/20 bg-rose-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${parsed.isLiability ? "bg-rose-500/15" : "bg-emerald-500/15"}`}>
              {parsed.isLiability ? <CreditCard className="h-4 w-4 text-rose-400" /> : <Building2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <div className="min-w-0">
              <p className={`text-[9px] uppercase tracking-widest ${parsed.isLiability ? "text-rose-400/60" : "text-emerald-400/60"}`}>{parsed.isLiability ? "Detected · Liability" : "Detected"}</p>
              <p className="text-sm font-medium text-zinc-100 truncate">{parsed.account_name || "Unknown account"}</p>
              <p className={`text-base font-bold font-mono tabular-nums ${parsed.isLiability ? "text-rose-400" : "text-emerald-400"}`}>{fmt(parsed.balance)}</p>
              {parsed.balSource === "computed" && parsed.creditLimit != null && parsed.availCredit != null && (
                <p className="text-[10px] font-mono tabular-nums text-white/40 mt-0.5">{fmt(parsed.creditLimit)} limit − {fmt(parsed.availCredit)} available</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Existing or new {parsed.isLiability ? "liability" : "account"}?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("existing")}
                disabled={(parsed.isLiability ? debts : accounts).length === 0}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors disabled:opacity-40 ${mode === "existing" ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" : "border-white/10 text-white/50 hover:text-white"}`}
              >
                <Building2 className="h-3.5 w-3.5" /> Existing
              </button>
              <button
                onClick={() => setMode("new")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-colors ${mode === "new" ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" : "border-white/10 text-white/50 hover:text-white"}`}
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
            </div>
          </div>

          {mode === "existing" && (
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Select {parsed.isLiability ? "liability" : "account"}</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="bg-black border-white/10 text-zinc-100"><SelectValue placeholder={`Choose a ${parsed.isLiability ? "liability" : "account"}…`} /></SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  {(parsed.isLiability ? debts : accounts).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} <span className="text-white/40 ml-1">({fmt((parsed.isLiability ? a.current_balance : a.balance) || 0)})</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-2">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">{parsed.isLiability ? "Liability name" : "Account name"}</Label>
                <Input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder={parsed.isLiability ? "e.g. Scotia Momentum Visa" : "Account name"} className="bg-black border-white/10 text-zinc-100" />
              </div>
              {!parsed.isLiability && (
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">Account type</Label>
                  <Select value={newAccountType} onValueChange={setNewAccountType}>
                    <SelectTrigger className="bg-black border-white/10 text-zinc-100"><SelectValue /></SelectTrigger>
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
            <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5 block">{mode === "existing" ? "Set new balance to" : "Starting balance"}</Label>
            <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} className="bg-black border-white/10 text-zinc-100 text-lg font-mono tabular-nums" />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            {saving ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>) : (<><Check className="h-4 w-4 mr-1.5" /> Update Balance</>)}
          </Button>
        </>
      )}

      {!done && multiParsed && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-white/50">{multiParsed.filter((i) => !i.dismissed).length} of {multiParsed.length} accounts selected</p>
          {multiParsed.map((item, idx) => (
            <div key={idx} className={`rounded-lg border p-2.5 transition-opacity ${item.dismissed ? "opacity-30 border-white/5" : "border-white/10 bg-white/[0.02]"}`}>
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${item.isLiability ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
                    {item.isLiability ? <CreditCard className="h-3.5 w-3.5 text-rose-400" /> : <Building2 className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-100 truncate">{item.account_name || "Unknown account"}</p>
                    <p className="text-[10px] font-mono tabular-nums text-white/40">{item.isLiability ? "Liability" : "Detected"}: {fmt(item.balance)}</p>
                  </div>
                </div>
                <button onClick={() => dismissMultiItem(idx)} className="h-6 w-6 rounded-md flex items-center justify-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
              {!item.dismissed && (
                <>
                  <Input type="number" step="0.01" value={item.editedBalance} onChange={(e) => updateMultiBalance(idx, e.target.value)} className="bg-black border-white/10 text-zinc-100 text-sm font-mono tabular-nums mb-2" />
                  {(item.isLiability ? debts : accounts).length > 0 && (
                    <Select value={item.matchedAccountId} onValueChange={(v) => updateMultiAccount(idx, v)}>
                      <SelectTrigger className="bg-black border-white/10 text-zinc-100 h-8"><SelectValue placeholder={`Match to ${item.isLiability ? "liability" : "account"}…`} /></SelectTrigger>
                      <SelectContent className="bg-black border-white/10">
                        {(item.isLiability ? debts : accounts).map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.name} <span className="text-white/40 ml-1">({fmt((item.isLiability ? a.current_balance : a.balance) || 0)})</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          ))}
          <Button onClick={handleMultiSave} disabled={saving} className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            {saving ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving…</>) : (<><Check className="h-4 w-4 mr-1.5" /> Confirm Updates</>)}
          </Button>
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 py-1">
          <div className="h-7 w-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Check className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xs text-emerald-300">Balance updated. Move on to the next file.</p>
        </div>
      )}
    </div>
  );
}