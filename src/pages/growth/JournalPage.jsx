import React, { useState } from "react";
import { BookOpen, Plus, Trash2, Calendar } from "lucide-react";
import { useSI } from "@/lib/SIContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MOODS = [
  { id: "great", label: "Great", emoji: "🟢" },
  { id: "good", label: "Good", emoji: "🟡" },
  { id: "okay", label: "Okay", emoji: "🟠" },
  { id: "rough", label: "Rough", emoji: "🔴" },
  { id: "bad", label: "Bad", emoji: "⚫" },
];

export default function JournalPage() {
  const { reflections, addReflection, deleteReflection } = useSI();
  const [showAdd, setShowAdd] = useState(false);
  const [mood, setMood] = useState("good");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!body.trim()) return;
    await addReflection({
      mood,
      title: title.trim() || "Untitled",
      body: body.trim(),
      date: new Date().toISOString(),
    });
    setMood("good");
    setTitle("");
    setBody("");
    setShowAdd(false);
  };

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return d; }
  };

  const moodColor = (m) => {
    const map = {
      great: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
      good: "border-amber-400/30 bg-amber-500/10 text-amber-300",
      okay: "border-orange-400/30 bg-orange-500/10 text-orange-300",
      rough: "border-red-400/30 bg-red-500/10 text-red-300",
      bad: "border-zinc-400/30 bg-zinc-500/10 text-zinc-300",
    };
    return map[m] || map.good;
  };

  return (
    <div className="dd-page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Reflection Journal</h1>
          <p className="text-sm text-white/50 mt-1">Capture thoughts, track your mood, reflect on progress.</p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Entry
        </Button>
      </div>

      {reflections.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/10 bg-black">
          <BookOpen className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-4">No journal entries yet.</p>
          <Button onClick={() => setShowAdd(true)} className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20" variant="outline">
            <Plus className="h-4 w-4 mr-1.5" /> Write First Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map(r => (
            <div
              key={r.id}
              className="group rounded-2xl border border-white/10 bg-black p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${moodColor(r.mood)}`}>
                    {r.mood || "good"}
                  </span>
                  <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-white/30">
                    <Calendar className="h-3 w-3" /> {formatDate(r.date || r.created_date)}
                  </span>
                  <button
                    onClick={() => deleteReflection(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">New Reflection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">How are you feeling?</label>
              <div className="flex gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-center transition-colors ${
                      mood === m.id
                        ? "border-amber-400/40 bg-amber-500/10"
                        : "border-white/10 bg-black hover:border-white/20"
                    }`}
                  >
                    <span className="text-lg block">{m.emoji}</span>
                    <span className={`text-[10px] ${mood === m.id ? "text-amber-300" : "text-white/40"}`}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Give your reflection a title..."
                className="bg-black border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Reflection</label>
              <Textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="What went well today? What could be better? What did you learn?"
                rows={5}
                className="bg-black border-white/10 text-white resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} className="text-white/50">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500/20 border border-amber-400/30 text-amber-200 hover:bg-amber-500/30">
                Save Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
