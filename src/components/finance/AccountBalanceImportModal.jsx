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
import { UploadCloud, Loader2, Check, Camera, ScanLine, Building2, Plus, X } from "lucide-react";

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    accounts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          account_name: { type: "string", description: "The name of the bank account shown (e.g. 'RBC Chequing', 'TD Savings', 'Scotia Momentum')" },
          balance: { type: "number", description: "The current balance amount shown in the image" },
        },
        required: ["account_name", "balance"],
      },
    },
  },
  required: ["accounts"],
};

const fmt = (v) => (v || 0).toLocaleString(undefined, {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export default function AccountBalanceImportModal({ open, onOpenChange, accounts = [], onSaved }) {
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
      const items = Array.isArray(out?.accounts)
        ? out.accounts
        : out?.account_name != null
          ? [{ account_name: out.account_name, balance: out.balance }]
          : [];

      if (items.length === 1) {
        const accountName = items[0].account_name || "";
        const bal = Number(items[0].balance) || 0;
        setParsed({ account_name: accountName, balance: bal });
        setBalance(String(bal));
        setNewAccountName(accountName);
        const match = accounts.find(
          (a) => a.name.toLowerCase().includes(accountName.toLowerCase()) ||
                 accountName.toLowerCase().includes(a.name.toLowerCase())
        );
        if (match) {
          setMode("existing");
          setSelectedAccountId(match.id);
        } else if (accounts.length > 0) {
          setMode("existing");
          setSelectedAccountId(accounts[0].id);
        } else {
          setMode("new");
        }
      } else if (items.length > 1) {
        setParsed({ account_name: "", balance: 0 });
        setMultiParsed(items.map((item) => {
          const name = item.account_name || "";
          const match = accounts.find(
            (a) => a.name.toLowerCase().includes(name.toLowerCase()) ||
                   name.toLowerCase().includes(a.name.toLowerCase())
          );
          return {
            account_name: name,
            balance: Number(item.balance) || 0,
            editedBalance: String(Number(item.balance) || 0),
            matchedAccountId: match?.id || (accounts.length > 0 ? accounts[0].id : ""),
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
      if (mode === "existing") {
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
        if (it.matchedAccountId) {
          await base44.entities.Account.update(it.matchedAccountId, { balance: bal });
        } else {
          await base44.entities.Account.create({ name: it.account_name.trim() || "Scanned Account", type: "chequing", balance: bal });
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
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-emerald-400/60">Detected</p>
                  <p className="text-sm font-medium text-zinc-100 truncate">{parsed.account_name || "Unknown account"}</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-emerald-400">{fmt(parsed.balance)}</p>
                </div>
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">
                  Is this an existing account or a new one?
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
                    Select account
                  </Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="bg-black border-white/10 text-zinc-100">
                      <SelectValue placeholder="Choose an account…" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border-white/10">
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} <span className="text-white/40 ml-1">({fmt(a.balance || 0)})</span>
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
                      Account name
                    </Label>
                    <Input
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Account name"
                      className="bg-black border-white/10 text-zinc-100"
                    />
                  </div>
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
                    <><Check className="h-4 w-4 mr-1.5" /> {mode === "existing" ? "Update Balance" : "Create Account"}</>
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
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">{item.account_name || "Unknown account"}</p>
                        <p className="text-[10px] font-mono tabular-nums text-white/40">Detected: {fmt(item.balance)}</p>
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
                      {accounts.length > 0 && (
                        <Select
                          value={item.matchedAccountId}
                          onValueChange={(v) => updateMultiAccount(idx, v)}
                        >
                          <SelectTrigger className="bg-black border-white/10 text-zinc-100 h-8">
                            <SelectValue placeholder="Match to account…" />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-white/10">
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name} <span className="text-white/40 ml-1">({fmt(a.balance || 0)})</span>
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