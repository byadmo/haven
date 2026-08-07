import React from "react";
import { UploadCloud, Loader2 } from "lucide-react";

// Reusable drag-and-drop file zone for course / syllabus / schedule / transcript
// uploads. Accepts ANY file type by default (no `accept` restriction), supports
// multi-file drop with a highlight state, and keeps a click-to-browse fallback.
// `onFiles` always receives an array of File objects (one item when multiple=false).
export default function FileDropzone({
  onFiles,
  multiple = true,
  hint = "Drag & drop your course schedule or class list here",
  subhint = "Any file type · or click to browse",
  accept,
  busy = false,
}) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDrag(false);
    if (busy) return;
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    onFiles?.(multiple ? files : [files[0]]);
  }

  function pick(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles?.(multiple ? files : [files[0]]);
    e.target.value = "";
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!busy) setDrag(true); }}
      onDragEnter={(e) => { e.preventDefault(); if (!busy) setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !busy) { e.preventDefault(); inputRef.current?.click(); } }}
      role="button"
      tabIndex={0}
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${drag ? "border-emerald-400 bg-emerald-500/10" : "border-white/15 hover:border-emerald-400/40"} ${busy ? "opacity-70 pointer-events-none" : ""}`}
    >
      {busy ? (
        <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
      ) : (
        <UploadCloud className={`h-7 w-7 ${drag ? "text-emerald-400" : "text-emerald-400/70"}`} />
      )}
      <p className="text-sm text-white/60">{hint}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/30">{subhint}</p>
      <input ref={inputRef} type="file" className="hidden" multiple={multiple} accept={accept} onChange={pick} />
    </div>
  );
}