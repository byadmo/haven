import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// Catalog parse-status display for the University settings card.
//   • failed / 0 courses → a clean, user-friendly message + an "Enter courses
//     manually" call-to-action, with the raw diagnostic log (self-heal trail +
//     parse_notes) collapsed behind a "Show technical details" toggle.
//   • success / partial with courses → the compact source + self-heal trail.
// Replaces the old raw "[GEMINI_FALLBACK] …" wall of text.
export default function CatalogParseNotice({ universityName, program, cache, sources, parsing }) {
  const [showTech, setShowTech] = React.useState(false);

  if (parsing) {
    return (
      <p className="text-[11px] text-emerald-300/80 flex items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing this page and storing the courses locally…
      </p>
    );
  }
  if (!cache) return null;

  const who = [universityName, program].filter(Boolean).join(" · ");
  const failed = cache.parse_status === "failed" || !cache.course_count;

  if (failed) {
    return (
      <div className="rounded border border-amber-400/30 bg-amber-500/[0.04] p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs text-zinc-100">
              We couldn't automatically parse course listings{who ? ` for ${who}` : ""} — this calendar site may not support automatic parsing.
            </p>
            <p className="text-[11px] text-white/40">
              You can still add courses by hand, or retry with a different calendar URL above.
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <Link to="/education/courses">
                <Button size="sm" className="bg-emerald-500 text-black hover:bg-emerald-400 h-8">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Enter courses manually
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setShowTech((s) => !s)}
                className="inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80"
              >
                {showTech ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showTech ? "Hide technical details" : "Show technical details"}
              </button>
            </div>
          </div>
        </div>

        {showTech && (
          <div className="ml-6 space-y-1.5 pt-2 border-t border-white/5">
            {sources.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-white/40">Self-heal trail</p>
                {sources.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.parse_status === "success" ? "bg-emerald-400" : s.parse_status === "partial" ? "bg-amber-400" : "bg-rose-400"}`} />
                    <span className="text-white/50 font-mono truncate flex-1 min-w-0">{s.url}</span>
                    <span className="text-white/40 font-mono shrink-0">{s.course_count} · {s.parse_status}</span>
                  </div>
                ))}
              </div>
            )}
            {cache.calendar_source_url && (
              <p className="text-[10px] text-white/30 font-mono truncate">Source: {cache.calendar_source_url}</p>
            )}
            {cache.parse_notes && (
              <p className="text-[10px] text-white/30 break-words font-mono leading-snug">{cache.parse_notes}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {sources.length > 0 && (
        <div className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Parsed sources — self-heal trail</p>
          {sources.map((s, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.parse_status === "success" ? "bg-emerald-400" : s.parse_status === "partial" ? "bg-amber-400" : "bg-rose-400"}`} />
              <span className="text-[11px] text-zinc-100 truncate flex-1 min-w-0">{s.url}</span>
              <span className="text-[10px] text-white/40 font-mono shrink-0">{s.course_count} · {s.parse_status}</span>
            </div>
          ))}
        </div>
      )}
      {cache.calendar_source_url && (
        <p className="text-[10px] text-white/30 font-mono truncate">Source: {cache.calendar_source_url}</p>
      )}
      {cache.parse_notes && (
        <p className="text-[10px] text-white/30 break-words">{cache.parse_notes}</p>
      )}
    </>
  );
}