// Searchable dropdown for picking a Canadian university. Filters the local
// comprehensive list as the user types, and falls back to manual entry (name,
// domain, catalog URL) when the university isn't in the list.
import React from "react";
import { Search, Loader2, Building2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchUniversities } from "@/lib/canadianUniversities";

export default function UniversitySelector({ value, onChange, compact = false }) {
  // `value` is the { name, domain, catalogUrl } object (or null).
  const initialName = value?.name || "";
  const [query, setQuery] = React.useState(initialName);
  const [open, setOpen] = React.useState(false);
  const [manual, setManual] = React.useState(false);
  const [manualForm, setManualForm] = React.useState({
    name: value?.name || "",
    domain: value?.domain || value?.university_domain || "",
    catalogUrl: value?.catalogUrl || value?.university_course_catalog_url || "",
  });
  const wrapRef = React.useRef(null);

  React.useEffect(() => {
    setQuery(value?.name || "");
    setManualForm({
      name: value?.name || "",
      domain: value?.domain || value?.university_domain || "",
      catalogUrl: value?.catalogUrl || value?.university_course_catalog_url || "",
    });
  }, [value]);

  React.useEffect(() => {
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = React.useMemo(() => searchUniversities(query), [query]);
  const showList = open && query && !manual;

  function pickUni(u) {
    onChange?.({ name: u.name, domain: u.domain, catalogUrl: u.catalogUrl });
    setQuery(u.name);
    setOpen(false);
  }

  function commitManual() {
    if (!manualForm.name) return;
    onChange?.({
      name: manualForm.name,
      domain: manualForm.domain,
      catalogUrl: manualForm.catalogUrl,
    });
    setQuery(manualForm.name);
    setManual(false);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setManual(false); if (!e.target.value) onChange?.(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Search Canadian universities…"
          className={`bg-black border-white/10 ${compact ? "h-9" : "h-10"} pl-8 pr-8`}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); onChange?.(null); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showList && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-white/10 bg-black shadow-lg">
          {results.length > 0 ? (
            results.slice(0, 30).map((u) => (
              <button
                key={u.name}
                type="button"
                onClick={() => pickUni(u)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-300/70 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-zinc-100 truncate">{u.name}</p>
                  <p className="text-[10px] text-white/40 font-mono truncate">{u.domain}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-center">
              <p className="text-[11px] text-white/50">No matches in our list.</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setManual(true); setOpen(false); setManualForm((p) => ({ ...p, name: query })); }}
            className="w-full px-3 py-2 text-left text-[11px] text-emerald-300 hover:bg-emerald-500/10 border-t border-white/10"
          >
            Can't find it? Enter manually →
          </button>
        </div>
      )}

      {manual && (
        <div className="mt-3 rounded-md border border-white/10 bg-black/50 p-3 space-y-2.5">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Manual university entry</p>
          <div>
            <Label className="text-[11px] text-white/50 mb-1 block">University name</Label>
            <Input
              value={manualForm.name}
              onChange={(e) => setManualForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. University of Waterloo"
              className="bg-black border-white/10 h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">Website domain</Label>
              <Input
                value={manualForm.domain}
                onChange={(e) => setManualForm((p) => ({ ...p, domain: e.target.value }))}
                placeholder="uwaterloo.ca"
                className="bg-black border-white/10 h-9"
              />
            </div>
            <div>
              <Label className="text-[11px] text-white/50 mb-1 block">Course catalog URL</Label>
              <Input
                value={manualForm.catalogUrl}
                onChange={(e) => setManualForm((p) => ({ ...p, catalogUrl: e.target.value }))}
                placeholder="https://…"
                className="bg-black border-white/10 h-9"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setManual(false)} className="text-[11px] text-white/40 hover:text-white px-2 py-1">Back to search</button>
            <button type="button" onClick={commitManual} className="ml-auto rounded bg-emerald-500 text-black text-[11px] font-medium px-3 py-1 hover:bg-emerald-400">Save university</button>
          </div>
        </div>
      )}
    </div>
  );
}