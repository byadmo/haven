import React, { useState } from "react";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEduSync } from "@/lib/eduSyncContext";
import { useToast } from "@/components/ui/use-toast";
import { resolveTaskTypes } from "@/lib/taskTypes";

const COLOR_SWATCHES = [
  "#3b82f6", "#a855f7", "#f59e0b", "#14b8a6", "#06b6d4",
  "#f43f5e", "#ef4444", "#10b981", "#ec4899", "#8b5cf6",
  "#64748b", "#eab308",
];

export default function TaskTypesSettings() {
  const { settings, updateSettings } = useEduSync();
  const { toast } = useToast();
  const types = resolveTaskTypes(settings);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [editIdx, setEditIdx] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#3b82f6");

  function persist(arr) {
    updateSettings({ task_types: arr });
  }

  function addType() {
    const name = newName.trim();
    if (!name) { toast({ title: "Enter a type name", variant: "destructive" }); return; }
    if (types.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Task type already exists", variant: "destructive" }); return;
    }
    persist([...types, { name, color: newColor }]);
    setNewName("");
    setNewColor("#3b82f6");
  }

  function startEdit(i) {
    setEditIdx(i);
    setEditName(types[i].name);
    setEditColor(types[i].color);
  }
  function commitEdit() {
    const name = editName.trim();
    if (!name) { toast({ title: "Name cannot be empty", variant: "destructive" }); return; }
    persist(types.map((t, i) => (i === editIdx ? { name, color: editColor } : t)));
    setEditIdx(null);
  }
  function removeType(i) {
    persist(types.filter((_, idx) => idx !== i));
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">Task Types</p>
      <div className="space-y-1.5 mb-4">
        {types.map((t, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border border-white/10 px-2.5 py-2">
            {editIdx === i ? (
              <>
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-5 w-5 rounded bg-transparent border border-white/10 cursor-pointer" />
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 h-7 bg-black border-white/10 text-sm" autoFocus />
                <button onClick={commitEdit} className="text-emerald-300 hover:text-emerald-200 p-1" title="Save"><Check className="h-4 w-4" /></button>
                <button onClick={() => setEditIdx(null)} className="text-white/40 hover:text-white p-1" title="Cancel"><X className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: t.color }} />
                <span className="flex-1 text-sm text-zinc-100">{t.name}</span>
                <button onClick={() => startEdit(i)} className="text-white/40 hover:text-emerald-300 p-1" title="Rename"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => removeType(i)} className="text-white/40 hover:text-rose-300 p-1" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2">Add Task Type</p>
      <div className="flex items-center gap-2">
        <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-8 w-8 rounded bg-transparent border border-white/10 cursor-pointer shrink-0" />
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Type name" className="flex-1 bg-black border-white/10 h-8" onKeyDown={(e) => e.key === "Enter" && addType()} />
        <Button size="sm" onClick={addType} className="bg-emerald-500 text-black hover:bg-emerald-400 h-8">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {COLOR_SWATCHES.map((c) => (
          <button key={c} onClick={() => setNewColor(c)} className="h-4 w-4 rounded-full border border-white/10" style={{ background: c }} aria-label={`color ${c}`} />
        ))}
      </div>
    </div>
  );
}