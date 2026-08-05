import React from "react";
import { UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const MAX_MB = 15;
const ARRAY_KEYS = [
  "accounts", "transactions", "bills", "recurring",
  "debts", "liabilities", "positions", "holdings",
  "items", "data", "results",
];

function pickArray(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res !== "object") return [];
  for (const k of ARRAY_KEYS) if (Array.isArray(res[k])) return res[k];
  for (const k of Object.keys(res)) if (Array.isArray(res[k])) return res[k];
  return [];
}

function isAccepted(file) {
  if (file.type.startsWith("image/")) return true;
  if (file.type === "application/pdf") return true;
  return /\.(png|jpe?g|pdf)$/i.test(file.name);
}

export default function StatementDropzone({
  prompt,
  schema,
  onExtracted,
  label = "Drop statements here or click to upload",
  hint = "PNG, JPG, or PDF — multiple files supported",
}) {
  const inputRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [pending, setPending] = React.useState(0);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setError(null);

    const bad = files.filter((f) => !isAccepted(f));
    if (bad.length) {
      setError(`Unsupported file type: ${bad.map((b) => b.name).join(", ")}. Use images or PDFs.`);
      return;
    }
    const tooBig = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig.length) {
      setError(`Files must be under ${MAX_MB}MB: ${tooBig.map((b) => b.name).join(", ")}`);
      return;
    }

    setBusy(true);
    setPending(files.length);
    const collected = [];
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: [file_url],
          response_json_schema: schema,
        });
        collected.push(...pickArray(res));
        setPending((p) => p - 1);
      }
      onExtracted(collected);
    } catch (e) {
      setError(e?.message || "Extraction failed. You can add entries manually below.");
    } finally {
      setBusy(false);
      setPending(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
        className={`group rounded-lg border border-dashed p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-emerald-500/60 bg-emerald-500/5"
            : "border-white/15 hover:border-emerald-500/40 hover:bg-white/[0.02]"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {busy ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
            <p className="text-xs text-zinc-300 font-mono">
              Analyzing your statement{pending > 1 ? ` · ${pending} left` : ""}…
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <UploadCloud className="h-7 w-7 text-white/40 group-hover:text-emerald-400 transition-colors" />
            <p className="text-sm text-zinc-200 font-mono">{label}</p>
            <p className="text-[11px] text-white/40">{hint}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-300">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}