import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Plus, X, ArrowUp, ArrowDown, RotateCcw, GripVertical } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useIsMobile } from "@/hooks/use-mobile";
import { normalizeConfig } from "@/lib/navConfig";

// Shared nav-customization modal for Haven Finance and Haven Education.
//
// Props:
//  open, onOpenChange          — Dialog state
//  pages                       — catalog [{ id, to, label, icon, locked? }]
//  defaultNav                  — default ordered id list
//  locked                      — ids that can't be removed (always in nav)
//  navItems                     — saved config (array of ids) or null/[]
//  onSave(ids)                 — async; persists new config
//  accent="emerald"|"indigo"   — theme for chips/borders (modal is portaled,
//                               outside the .finance-accent wrapper, so the
//                               CSS-var remap doesn't reach it — pass accent)
//  title / subtitle             — header copy
export default function CustomizeNavModal({
  open, onOpenChange, pages, defaultNav, locked, navItems, onSave,
  accent = "emerald", title = "Customize Navigation", subtitle = "Add, remove, and reorder the pages in your nav bar.",
}) {
  const isMobile = useIsMobile();
  const [draft, setDraft] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(normalizeConfig(navItems, defaultNav, locked));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const byId = Object.fromEntries(pages.map((p) => [p.id, p]));
  const onIds = draft.filter((id) => byId[id]);
  const availableIds = pages.map((p) => p.id).filter((id) => !onIds.includes(id) && byId[id]);

  function add(id) { setDraft((d) => [...d, id]); }
  function remove(id) { if (locked.includes(id)) return; setDraft((d) => d.filter((x) => x !== id)); }
  function move(id, dir) {
    setDraft((d) => {
      const i = d.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.length) return d;
      const next = [...d];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function reset() { setDraft(normalizeConfig(defaultNav, defaultNav, locked)); }

  async function save() {
    setSaving(true);
    try {
      await onSave(normalizeConfig(draft, defaultNav, locked));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const onDragEnd = (res) => {
    const { source, destination } = res;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (source.droppableId === "nav" && destination.droppableId === "nav") {
      // reorder
      setDraft((d) => {
        const next = [...d];
        const [m] = next.splice(source.index, 1);
        next.splice(destination.index, 0, m);
        return next;
      });
    } else if (source.droppableId === "available" && destination.droppableId === "nav") {
      // add the dragged available item at position
      const id = availableIds[source.index];
      setDraft((d) => {
        const next = [...d];
        next.splice(destination.index, 0, id);
        return next;
      });
    } else if (source.droppableId === "nav" && destination.droppableId === "available") {
      // remove the dragged item (unless locked)
      const id = onIds[source.index];
      if (!locked.includes(id)) setDraft((d) => d.filter((x) => x !== id));
    }
  };

  // Accent token maps. The modal lives in a portal at document.body, so the
  // .finance-accent CSS-var remap is not in scope — use explicit hex shades.
  const A = accent === "indigo"
    ? { text: "text-indigo-300", chip: "border-indigo-400/30 bg-indigo-500/10 text-indigo-200", dot: "bg-indigo-400", btn: "bg-indigo-600 hover:bg-indigo-500" }
    : { text: "text-emerald-300", chip: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200", dot: "bg-emerald-400", btn: "bg-emerald-600 hover:bg-emerald-500" };

  function NavRow({ page, index }) {
    const Icon = page.icon;
    const isLocked = locked.includes(page.id);
    return (
      <Draggable draggableId={`nav-${page.id}`} index={index} isDragDisabled={isMobile || isLocked}>
        {(pvd, snap) => (
          <div
            ref={pvd.innerRef}
            {...pvd.draggableProps}
            className={`flex items-center gap-2 rounded-md border border-white/10 bg-black px-2.5 py-2 mb-2 ${snap.isDragging ? "opacity-80" : ""}`}
          >
            {!isMobile && !isLocked && (
              <span {...pvd.dragHandleProps} className="cursor-grab text-white/30 hover:text-white/60 touch-none">
                <GripVertical className="h-4 w-4" />
              </span>
            )}
            <Icon className="h-4 w-4 text-white/55 shrink-0" strokeWidth={1.75} />
            <span className="text-sm text-zinc-100 flex-1 min-w-0 truncate">{page.label}</span>
            {isLocked && <Lock className="h-3.5 w-3.5 text-white/30 shrink-0" />}
            {isMobile ? (
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => move(page.id, -1)} disabled={index === 0} className="h-7 w-7 grid place-items-center text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(page.id, 1)} disabled={index === onIds.length - 1} className="h-7 w-7 grid place-items-center text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                {!isLocked && (
                  <button onClick={() => remove(page.id)} className="h-7 w-7 grid place-items-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors" aria-label={`Remove ${page.label}`}><X className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ) : (
              !isLocked && (
                <button onClick={() => remove(page.id)} className="h-7 w-7 grid place-items-center text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors shrink-0" aria-label={`Remove ${page.label}`}><X className="h-3.5 w-3.5" /></button>
              )
            )}
          </div>
        )}
      </Draggable>
    );
  }

  function AvailRow({ page }) {
    const Icon = page.icon;
    return (
      <div className="flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2.5 py-2 mb-2">
        <Icon className="h-4 w-4 text-white/45 shrink-0" strokeWidth={1.75} />
        <span className="text-sm text-white/70 flex-1 min-w-0 truncate">{page.label}</span>
        <button onClick={() => add(page.id)} className={`h-7 w-7 grid place-items-center rounded transition-colors shrink-0 ${A.text} hover:bg-white/5`} aria-label={`Add ${page.label}`}><Plus className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/15 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <span className={`h-1.5 w-1.5 rounded-full ${A.dot}`} /> {title}
          </DialogTitle>
          <DialogDescription className="text-white/50">{subtitle}</DialogDescription>
        </DialogHeader>

        {/* Preview */}
        <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 min-w-min">
            {onIds.map((id) => {
              const p = byId[id]; if (!p) return null;
              const Icon = p.icon;
              return (
                <span key={`pv-${id}`} className={`flex items-center gap-1 rounded ${A.chip} px-2 py-1 text-[11px] whitespace-nowrap shrink-0`}>
                  <Icon className="h-3 w-3" strokeWidth={1.75} /> {p.label}
                </span>
              );
            })}
            <span className="flex items-center gap-1 rounded border border-white/10 bg-white/5 text-white/40 px-2 py-1 text-[11px] whitespace-nowrap shrink-0">More</span>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* ON NAV BAR */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-white/50">On Nav Bar</span>
                <span className="text-[10px] text-white/30">{onIds.length} visible</span>
              </div>
              <Droppable droppableId="nav">
                {(pvd) => (
                  <div ref={pvd.innerRef} {...pvd.droppableProps} className="min-h-[120px] rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-1">
                    {onIds.map((id, i) => { const p = byId[id]; return p ? <NavRow key={`n-${id}`} page={p} index={i} /> : null; })}
                    {pvd.placeholder}
                    {onIds.length === 0 && <p className="text-[11px] text-white/30 text-center py-4">Drag pages here</p>}
                  </div>
                )}
              </Droppable>
            </div>

            {/* AVAILABLE */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-white/50">Available Items</span>
                <span className="text-[10px] text-white/30">{availableIds.length} hidden</span>
              </div>
              <Droppable droppableId="available">
                {(pvd) => (
                  <div ref={pvd.innerRef} {...pvd.droppableProps} className="min-h-[120px] rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-1">
                    {availableIds.map((id, i) => { const p = byId[id]; return p ? (
                      <Draggable key={`a-${id}`} draggableId={`a${id}`} index={i} isDragDisabled={isMobile}>
                        {(dpvd) => (
                          <div ref={dpvd.innerRef} {...dpvd.draggableProps} {...dpvd.dragHandleProps}>
                            <AvailRow page={p} />
                          </div>
                        )}
                      </Draggable>
                    ) : null; })}
                    {pvd.placeholder}
                    {availableIds.length === 0 && <p className="text-[11px] text-white/30 text-center py-4">All pages are on the nav bar</p>}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </DragDropContext>

        <p className="text-[11px] text-white/35">
          {isMobile
            ? "Use the ↑ ↓ arrows to reorder and × to move a page to the More menu."
            : "Drag items between lists to add or remove, and drag to reorder inside On Nav Bar."}
        </p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="outline" onClick={reset} className="border-white/10 text-white/50 hover:bg-white/5">
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset to Default
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-zinc-300 hover:bg-white/5">Cancel</Button>
            <Button onClick={save} disabled={saving} className={`${A.btn} text-white`}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}