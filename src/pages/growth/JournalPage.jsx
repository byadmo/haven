import React, { useState, useMemo } from "react";
import { BookOpen, Plus, Trash2, Calendar, Search, Tag, Filter, Sparkles, ListChecks } from "lucide-react";
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

const WRITING_PROMPTS = [
  "What made you smile today?",
  "What's one thing you learned?",
  "What went better than expected?",
  "What could you have done differently?",
  "What are you grateful for today?",
  "What's a challenge you're facing?",
  "Describe a moment you felt proud.",
  "What's something you want to improve tomorrow?",
  "What did you do for someone else today?",
  "What's a win from today, no matter how small?",
  "How did your habits affect your mood?",
  "What's one thing you'd tell your future self about today?",
];

const COMMON_TAGS = ["gratitude", "learning", "health", "work", "relationships", "finance", "fitness", "mindfulness", "creativity", "growth"];

export default function JournalPage() {
  const { reflections, addReflection, deleteReflection, addTagToReflection, removeTagFromReflection } = useSI();
  const [showAdd, setShowAdd] = useState(false);
  const [mood, setMood] = useState("good");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [search, setSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState("all");
  const [showPrompts, setShowPrompts] = useState(false);

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!body.trim()) return;
    await addReflection({
      mood,
      title: title.trim() || "Untitled",
      body: body.trim(),
      tags: selectedTags,
      date: new Date().toISOString(),
    });
    setMood("good");
    setTitle("");
    setBody("");
    setSelectedTags([]);
    setShowAdd(false);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const filtered = useMemo(() => {
    let list = [...reflections];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.title || "").toLowerCase().includes(q) ||
        (r.body || "").toLowerCase().includes(q) ||
        (r.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (moodFilter !== "all") {
      list = list.filter(r => r.mood === moodFilter);
    }
    return list;
  }, [reflections, search, moodFilter]);

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

  // Journaling streak (consecutive days with at least one entry)
  const journalStreak = useMemo(() => {
    const dates = [...new Set(reflections.map(r => {
      const d = new Date(r.date || r.created_date);
      return d.toISOString().slice(0, 10);
    }))].sort().reverse();
    if (dates.length === 0) return 0;
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let cursor = new Date(today);
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().slice(0, 10);
      if (dates.includes(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else if (i === 0) {
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [reflections]);

  return (
    <div className="dd-page-enter space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Reflection Journal</h1>
          <p className="text-sm text-white/50 mt-1">
            Capture thoughts, track your mood, reflect on progress.
            {journalStreak > 0 && (
              <span className="text-orange-300 ml-2">🔥 {journalStreak} day journal streak</span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Entry
        </Button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="bg-black border-white/10 text-white text-xs pl-8 h-9"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-white/30" />
          <select
            value={moodFilter}
            onChange={(e) => setMoodFilter(e.target.value)}
            className="h-8 rounded-md border border-white/10 bg-black text-xs text-white/70 px-2 outline-none focus:border-amber-400/40"
          >
            <option value="all">All moods</option>
            {MOODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowPrompts(true)}
          className="text-white/40 hover:text-amber-300 text-xs"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Prompts
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/10 bg-black">
          <BookOpen className="h-10 w-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-4">
            {search || moodFilter !== "all" ? "No entries match your search." : "No journal entries yet."}
          </p>
          <Button onClick={() => setShowAdd(true)} className="bg-amber-500/10 border border-amber-400/30 text-amber-300 hover:bg-amber-500/20" variant="outline">
            <Plus className="h-4 w-4 mr-1.5" /> Write First Entry
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div
              key={r.id}
              className="group rounded-2xl border border-white/10 bg-black p-5 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${moodColor(r.mood)}`}>
                    {r.mood || "good"}
                  </span>
                  <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                  {/* Tags */}
                  {(r.tags || []).map(tag => (
                    <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40">
                      <Tag className="h-2.5 w-2.5" /> {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
              <label className="text-xs text-white/50 mb-1.5 block">Tags</label>
              <div className="flex gap-1.5 flex-wrap">
                {COMMON_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-colors ${
                      selectedTags.includes(tag)
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-300"
                        : "border-white/10 bg-black text-white/40 hover:border-white/20"
                    }`}
                  >
                    <Tag className="h-2.5 w-2.5" /> {tag}
                  </button>
                ))}
              </div>
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

      {/* Writing Prompts Dialog */}
      <Dialog open={showPrompts} onOpenChange={setShowPrompts}>
        <DialogContent className="bg-zinc-950 border-white/10 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-amber-400" /> Writing Prompts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {WRITING_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setTitle(prompt);
                  setShowPrompts(false);
                  setShowAdd(true);
                }}
                className="w-full text-left rounded-lg border border-white/10 bg-black p-3 text-sm text-white/60 hover:border-amber-400/30 hover:text-amber-300 transition-colors"
              >
                <span className="text-amber-400/50 mr-2">✏️</span> {prompt}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}