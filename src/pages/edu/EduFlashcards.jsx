import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers, Plus, ArrowLeft, RotateCcw, Lightbulb,
  CheckCircle2, XCircle, ChevronRight, BookOpen,
  Trash2, Edit3, Save, Hash, Clock,
} from "lucide-react";
import { useEduSync } from "@/lib/eduSyncContext";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── SM-2 Spaced Repetition Algorithm ────────────────────────────────────────

const SM2_EF_MIN = 1.3;
const SM2_EF_MAX = 3.0;

function sm2Schedule(quality, card) {
  // quality ∈ {0, 1, 2, 3, 4, 5} mapped from review buttons
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let { easiness = 2.5, interval = 0, repetitions = 0 } = card;

  // Update easiness factor
  const ef = Math.max(
    SM2_EF_MIN,
    Math.min(
      SM2_EF_MAX,
      easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    )
  );

  const passed = q >= 3;
  let newInterval;
  let newRepetitions;

  if (!passed) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = repetitions + 1;
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * ef);
    }
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    easiness: +ef.toFixed(2),
    interval: newInterval,
    repetitions: newRepetitions,
    next_review: nextReview.toISOString().slice(0, 10),
    last_reviewed: new Date().toISOString(),
  };
}

function dueCards(cards) {
  const today = new Date().toISOString().slice(0, 10);
  return (cards || []).filter(
    (c) => !c.next_review || c.next_review <= today
  ).sort((a, b) => {
    // Cards never reviewed first, then by oldest next_review
    if (!a.next_review && !b.next_review) return 0;
    if (!a.next_review) return -1;
    if (!b.next_review) return 1;
    return a.next_review.localeCompare(b.next_review);
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DECK_COLORS = ["emerald", "indigo", "purple", "amber", "sky", "rose", "teal", "orange"];

function colorClasses(color) {
  const map = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    indigo: "border-indigo-400/30 bg-indigo-500/10 text-indigo-300",
    purple: "border-purple-400/30 bg-purple-500/10 text-purple-300",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    sky: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    rose: "border-rose-400/30 bg-rose-500/10 text-rose-300",
    teal: "border-teal-400/30 bg-teal-500/10 text-teal-300",
    orange: "border-orange-400/30 bg-orange-500/10 text-orange-300",
  };
  return map[color] || map.emerald;
}

function dueLabel(card) {
  if (!card.next_review) return "New";
  const today = new Date().toISOString().slice(0, 10);
  if (card.next_review <= today) return "Due";
  const diff = Math.ceil(
    (new Date(card.next_review) - new Date()) / (1000 * 60 * 60 * 24)
  );
  return `${diff}d`;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function EduFlashcards() {
  const { courses } = useEduSync();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Screen state: "list" | "deck" | "review"
  const [screen, setScreen] = useState("list");
  const [selectedDeckId, setSelectedDeckId] = useState(null);

  // Data
  const [decks, setDecks] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Deck form
  const [deckFormOpen, setDeckFormOpen] = useState(false);
  const [deckForm, setDeckForm] = useState({ name: "", description: "", course_id: "", color: "emerald" });

  // Card form
  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ front: "", back: "", hint: "", tags: "" });
  const [editingCardId, setEditingCardId] = useState(null);

  // Review state
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  const courseById = useMemo(
    () => Object.fromEntries((courses || []).map((c) => [c.id, c])),
    [courses]
  );

  // ── Data Loading ──

  const loadDecks = useCallback(async () => {
    try {
      const d = await base44.entities.FlashcardDeck.list("-created_date", 200);
      setDecks(d || []);
    } catch { setDecks([]); }
  }, []);

  const loadCards = useCallback(async (deckId) => {
    if (!deckId) { setCards([]); return; }
    try {
      const c = await base44.entities.Flashcard.list("-created_date", 5000);
      setCards((c || []).filter((card) => card.deck_id === deckId));
    } catch { setCards([]); }
  }, []);

  useEffect(() => {
    Promise.all([loadDecks()]).finally(() => setLoading(false));
  }, [loadDecks]);

  // If URL has ?deck=<id> param, auto-open that deck
  useEffect(() => {
    const deckId = searchParams.get("deck");
    if (deckId && decks.length > 0) {
      const exists = decks.find((d) => d.id === deckId);
      if (exists) {
        setSelectedDeckId(deckId);
        loadCards(deckId);
        setScreen("deck");
      }
    }
  }, [searchParams, decks, loadCards]);

  // ── Deck CRUD ──

  async function createDeck() {
    if (!deckForm.name.trim()) {
      toast({ title: "Deck name is required", variant: "destructive" });
      return;
    }
    try {
      await base44.entities.FlashcardDeck.create({
        name: deckForm.name.trim(),
        description: deckForm.description.trim(),
        course_id: deckForm.course_id || null,
        color: deckForm.color,
        card_count: 0,
      });
      toast({ title: "Deck created" });
      setDeckFormOpen(false);
      setDeckForm({ name: "", description: "", course_id: "", color: "emerald" });
      await loadDecks();
    } catch (e) {
      toast({ title: "Could not create deck", description: e?.message, variant: "destructive" });
    }
  }

  async function deleteDeck(id) {
    const deck = decks.find((d) => d.id === id);
    if (!deck) return;
    try {
      // Delete all cards in the deck first
      const deckCards = cards.filter((c) => c.deck_id === id);
      if (deckCards.length > 0) {
        await base44.entities.Flashcard.deleteMany({ deck_id: id });
      }
      await base44.entities.FlashcardDeck.delete(id);
      toast({ title: `Deleted "${deck.name}"` });
      if (selectedDeckId === id) {
        setScreen("list");
        setSelectedDeckId(null);
        setCards([]);
      }
      await loadDecks();
    } catch (e) {
      toast({ title: "Could not delete deck", description: e?.message, variant: "destructive" });
    }
  }

  // ── Card CRUD ──

  async function createCard() {
    if (!cardForm.front.trim() || !cardForm.back.trim()) {
      toast({ title: "Front and back are required", variant: "destructive" });
      return;
    }
    try {
      const tags = cardForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await base44.entities.Flashcard.create({
        deck_id: selectedDeckId,
        front: cardForm.front.trim(),
        back: cardForm.back.trim(),
        hint: cardForm.hint.trim() || null,
        tags: tags.length ? tags : null,
      });
      // Update deck card_count
      const newCount = (cards.length || 0) + 1;
      await base44.entities.FlashcardDeck.update(selectedDeckId, { card_count: newCount });
      setDecks((prev) =>
        prev.map((d) =>
          d.id === selectedDeckId ? { ...d, card_count: newCount } : d
        )
      );
      toast({ title: "Card added" });
      setCardFormOpen(false);
      setCardForm({ front: "", back: "", hint: "", tags: "" });
      await loadCards(selectedDeckId);
    } catch (e) {
      toast({ title: "Could not create card", description: e?.message, variant: "destructive" });
    }
  }

  async function updateCard() {
    if (!editingCardId) return;
    if (!cardForm.front.trim() || !cardForm.back.trim()) {
      toast({ title: "Front and back are required", variant: "destructive" });
      return;
    }
    try {
      const tags = cardForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await base44.entities.Flashcard.update(editingCardId, {
        front: cardForm.front.trim(),
        back: cardForm.back.trim(),
        hint: cardForm.hint.trim() || null,
        tags: tags.length ? tags : null,
      });
      toast({ title: "Card updated" });
      setCardFormOpen(false);
      setEditingCardId(null);
      setCardForm({ front: "", back: "", hint: "", tags: "" });
      await loadCards(selectedDeckId);
    } catch (e) {
      toast({ title: "Could not update card", description: e?.message, variant: "destructive" });
    }
  }

  async function deleteCard(id) {
    try {
      await base44.entities.Flashcard.delete(id);
      const newCount = (cards.length || 0) - 1;
      await base44.entities.FlashcardDeck.update(selectedDeckId, { card_count: Math.max(0, newCount) });
      setDecks((prev) =>
        prev.map((d) =>
          d.id === selectedDeckId ? { ...d, card_count: Math.max(0, newCount) } : d
        )
      );
      toast({ title: "Card deleted" });
      await loadCards(selectedDeckId);
    } catch (e) {
      toast({ title: "Could not delete card", description: e?.message, variant: "destructive" });
    }
  }

  function openEditCard(card) {
    setEditingCardId(card.id);
    setCardForm({
      front: card.front || "",
      back: card.back || "",
      hint: card.hint || "",
      tags: Array.isArray(card.tags) ? card.tags.join(", ") : "",
    });
    setCardFormOpen(true);
  }

  // ── Review Logic ──

  function startReview() {
    const due = dueCards(cards);
    if (due.length === 0) {
      toast({ title: "No cards due for review", description: "Add more cards or come back later!" });
      return;
    }
    setReviewQueue(due);
    setReviewIndex(0);
    setFlipped(false);
    setShowHint(false);
    setReviewComplete(false);
    setScreen("review");
  }

  async function rateCard(quality) {
    const card = reviewQueue[reviewIndex];
    if (!card) return;

    const updates = sm2Schedule(quality, card);
    try {
      await base44.entities.Flashcard.update(card.id, updates);
    } catch {
      // Surface without blocking review flow
      toast({ title: "Could not save review", variant: "destructive" });
    }

    if (reviewIndex < reviewQueue.length - 1) {
      setReviewIndex((i) => i + 1);
      setFlipped(false);
      setShowHint(false);
    } else {
      setReviewComplete(true);
      // Reload cards to reflect updated schedule
      await loadCards(selectedDeckId);
    }
  }

  function reopenReview() {
    setReviewComplete(false);
    setReviewIndex(0);
    setFlipped(false);
    setShowHint(false);
    // Re-filter in case cards were reviewed
    const due = dueCards(cards);
    if (due.length === 0) {
      toast({ title: "All caught up! 🎉", description: "No more cards due right now." });
      setScreen("deck");
      return;
    }
    setReviewQueue(due);
  }

  // ── Deck view helpers ──

  function openDeck(deck) {
    setSelectedDeckId(deck.id);
    loadCards(deck.id);
    setScreen("deck");
  }

  function backToList() {
    setScreen("list");
    setSelectedDeckId(null);
    setCards([]);
  }

  function backToDeck() {
    setScreen("deck");
    setReviewQueue([]);
    setReviewIndex(0);
    setFlipped(false);
    setReviewComplete(false);
  }

  // ── Deck list screen ──

  if (screen === "list") {
    return (
      <div className="dd-page-enter">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Flashcards</h1>
            <p className="text-sm text-white/50 mt-1">Spaced repetition review — retain what you learn.</p>
          </div>
          <button
            onClick={() => setDeckFormOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New Deck
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6 animate-pulse">
                <div className="h-5 w-3/4 bg-white/5 rounded mb-3" />
                <div className="h-3 w-1/2 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black p-12 text-center">
            <Layers className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-1">No flashcard decks yet.</p>
            <p className="text-xs text-white/30 mb-4">Create your first deck to start studying with spaced repetition.</p>
            <Button
              onClick={() => setDeckFormOpen(true)}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create Deck
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => {
              const cols = colorClasses(deck.color || "emerald");
              const dueCount = dueCards(cards.filter((c) => c.deck_id === deck.id)).length;
              return (
                <button
                  key={deck.id}
                  onClick={() => openDeck(deck)}
                  className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6 text-left hover:border-white/20 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-10 w-10 rounded-xl border grid place-items-center shrink-0 ${cols}`}>
                      <Layers className="h-5 w-5" />
                    </div>
                    {dueCount > 0 && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-semibold">
                        {dueCount} due
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                    {deck.name}
                  </p>
                  {deck.description && (
                    <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{deck.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-[10px] text-white/40 font-mono">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {deck.card_count || 0}
                    </span>
                    {deck.course_id && courseById[deck.course_id] && (
                      <span>{courseById[deck.course_id].code}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Create Deck Dialog */}
        <Dialog open={deckFormOpen} onOpenChange={setDeckFormOpen}>
          <DialogContent className="bg-black border border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">New Flashcard Deck</DialogTitle>
              <DialogDescription className="text-white/50 text-xs">
                Create a deck to organize your flashcards by subject.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Deck name *</Label>
                <Input
                  value={deckForm.name}
                  onChange={(e) => setDeckForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. ECE 243 - Midterm Prep"
                  className="bg-black border-white/10"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Description</Label>
                <Input
                  value={deckForm.description}
                  onChange={(e) => setDeckForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Key topics covered in this deck"
                  className="bg-black border-white/10"
                />
              </div>
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Course</Label>
                <Select
                  value={deckForm.course_id}
                  onValueChange={(v) => setDeckForm((f) => ({ ...f, course_id: v }))}
                >
                  <SelectTrigger className="bg-black border-white/10">
                    <SelectValue placeholder="None (general deck)" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border border-white/10">
                    <SelectItem value="__none__">None (general deck)</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {DECK_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDeckForm((f) => ({ ...f, color: c }))}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        deckForm.color === c
                          ? "border-white scale-110"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c === "emerald" ? "#10b981" : c === "indigo" ? "#6366f1" : c === "purple" ? "#a855f7" : c === "amber" ? "#f59e0b" : c === "sky" ? "#0ea5e9" : c === "rose" ? "#f43f5e" : c === "teal" ? "#14b8a6" : "#f97316" }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeckFormOpen(false)}
                className="border-white/10 text-white/50"
              >
                Cancel
              </Button>
              <Button
                onClick={createDeck}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                <Save className="h-4 w-4 mr-1.5" /> Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Deck detail screen ──

  if (screen === "deck") {
    const deck = decks.find((d) => d.id === selectedDeckId);
    if (!deck) return null;

    const due = dueCards(cards);
    const reviewedCount = cards.filter((c) => c.repetitions > 0).length;
    const masteredCount = cards.filter((c) => c.interval >= 21).length;

    return (
      <div className="dd-page-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={backToList}
              className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">{deck.name}</h1>
                {deck.color && (
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        deck.color === "emerald" ? "#10b981" :
                        deck.color === "indigo" ? "#6366f1" :
                        deck.color === "purple" ? "#a855f7" :
                        deck.color === "amber" ? "#f59e0b" :
                        deck.color === "sky" ? "#0ea5e9" :
                        deck.color === "rose" ? "#f43f5e" :
                        deck.color === "teal" ? "#14b8a6" : "#f97316",
                    }}
                  />
                )}
              </div>
              <p className="text-sm text-white/50 mt-1">
                {deck.card_count || 0} cards
                {deck.course_id && courseById[deck.course_id]
                  ? ` · ${courseById[deck.course_id].code}`
                  : ""}
                {deck.description ? ` · ${deck.description}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingCardId(null); setCardForm({ front: "", back: "", hint: "", tags: "" }); setCardFormOpen(true); }}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Card
            </button>
            <button
              onClick={startReview}
              disabled={due.length === 0}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Review ({due.length})
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-white/10 bg-black p-3 sm:p-4 text-center">
            <p className="text-lg font-semibold text-white font-mono">{due.length}</p>
            <p className="text-[10px] text-white/40">Due now</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black p-3 sm:p-4 text-center">
            <p className="text-lg font-semibold text-white font-mono">{reviewedCount}</p>
            <p className="text-[10px] text-white/40">Reviewed</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black p-3 sm:p-4 text-center">
            <p className="text-lg font-semibold text-white font-mono">{masteredCount}</p>
            <p className="text-[10px] text-white/40">Mastered (21d+)</p>
          </div>
        </div>

        {/* Card list */}
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black p-12 text-center">
            <BookOpen className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-1">This deck is empty.</p>
            <p className="text-xs text-white/30 mb-4">Add your first flashcard to start studying.</p>
            <Button
              onClick={() => { setEditingCardId(null); setCardForm({ front: "", back: "", hint: "", tags: "" }); setCardFormOpen(true); }}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Add Card
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((card, idx) => {
              const isDue = !card.next_review || card.next_review <= new Date().toISOString().slice(0, 10);
              return (
                <div
                  key={card.id}
                  className="rounded-xl border border-white/10 bg-black p-4 flex items-center justify-between gap-3 hover:border-white/20 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30 font-mono shrink-0">#{idx + 1}</span>
                      <p className="text-sm text-white truncate">{card.front}</p>
                      {isDue && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-semibold">
                          {dueLabel(card)}
                        </span>
                      )}
                      {!isDue && card.repetitions > 0 && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/5 text-white/30 text-[9px] font-mono">
                          {dueLabel(card)}
                        </span>
                      )}
                    </div>
                    {card.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {card.tags.map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] text-white/40 font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditCard(card)}
                      className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors"
                      title="Edit card"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="h-7 w-7 grid place-items-center rounded-md border border-white/10 text-rose-400/60 hover:text-rose-300 hover:border-rose-400/30 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete deck */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <button
            onClick={() => {
              if (window.confirm(`Delete deck "${deck.name}" and all its cards?`)) {
                deleteDeck(deck.id);
              }
            }}
            className="flex items-center gap-1.5 text-xs text-rose-400/60 hover:text-rose-300 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete this deck
          </button>
        </div>

        {/* Add / Edit Card Dialog */}
        <Dialog open={cardFormOpen} onOpenChange={(o) => { if (!o) { setEditingCardId(null); setCardForm({ front: "", back: "", hint: "", tags: "" }); } setCardFormOpen(o); }}>
          <DialogContent className="bg-black border border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">{editingCardId ? "Edit Card" : "New Flashcard"}</DialogTitle>
              <DialogDescription className="text-white/50 text-xs">
                {editingCardId ? "Update the question and answer." : "Add a question (front) and answer (back) pair."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Front (question) *</Label>
                <Textarea
                  value={cardForm.front}
                  onChange={(e) => setCardForm((f) => ({ ...f, front: e.target.value }))}
                  placeholder="What is the capital of France?"
                  className="bg-black border-white/10 min-h-[60px] resize-none"
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Back (answer) *</Label>
                <Textarea
                  value={cardForm.back}
                  onChange={(e) => setCardForm((f) => ({ ...f, back: e.target.value }))}
                  placeholder="Paris"
                  className="bg-black border-white/10 min-h-[60px] resize-none"
                />
              </div>
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Hint (optional)</Label>
                <Input
                  value={cardForm.hint}
                  onChange={(e) => setCardForm((f) => ({ ...f, hint: e.target.value }))}
                  placeholder="A clue to help recall the answer"
                  className="bg-black border-white/10"
                />
              </div>
              <div>
                <Label className="text-[11px] text-white/50 mb-1 block">Tags (comma-separated)</Label>
                <Input
                  value={cardForm.tags}
                  onChange={(e) => setCardForm((f) => ({ ...f, tags: e.target.value }))}
                  placeholder="geography, capitals, europe"
                  className="bg-black border-white/10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setCardFormOpen(false); setEditingCardId(null); setCardForm({ front: "", back: "", hint: "", tags: "" }); }}
                className="border-white/10 text-white/50"
              >
                Cancel
              </Button>
              <Button
                onClick={editingCardId ? updateCard : createCard}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                <Save className="h-4 w-4 mr-1.5" /> {editingCardId ? "Save" : "Add Card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Review screen ──

  if (screen === "review") {
    if (reviewComplete) {
      const due = dueCards(cards);
      return (
        <div className="dd-page-enter">
          <div className="max-w-lg mx-auto pt-12 text-center">
            <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 p-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Review Complete! 🎉</h2>
              <p className="text-sm text-white/50 mb-2">
                You reviewed {reviewQueue.length} {reviewQueue.length === 1 ? "card" : "cards"}.
              </p>
              {due.length > 0 && (
                <p className="text-xs text-amber-300/80 mb-6">
                  {due.length} more {due.length === 1 ? "card is" : "cards are"} due — reopen to continue.
                </p>
              )}
              {due.length === 0 && (
                <p className="text-xs text-emerald-300/80 mb-6">All caught up! Come back later for your next review.</p>
              )}
              <div className="flex items-center justify-center gap-3">
                {due.length > 0 && (
                  <Button onClick={reopenReview} className="bg-emerald-500 text-black hover:bg-emerald-400">
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Review More
                  </Button>
                )}
                <Button
                  onClick={backToDeck}
                  variant="outline"
                  className="border-white/10 text-white/70"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Deck
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const card = reviewQueue[reviewIndex];
    if (!card) {
      return (
        <div className="dd-page-enter">
          <div className="max-w-lg mx-auto pt-12 text-center">
            <div className="rounded-2xl border border-white/10 bg-black p-8">
              <RotateCcw className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">No cards to review.</p>
              <Button onClick={backToDeck} variant="outline" className="border-white/10 text-white/70 mt-4">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Deck
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const progress = ((reviewIndex) / reviewQueue.length) * 100;

    return (
      <div className="dd-page-enter">
        <div className="max-w-lg mx-auto">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={backToDeck}
              className="h-8 w-8 grid place-items-center rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40 font-mono">{reviewIndex + 1} / {reviewQueue.length}</span>
                <span className="text-white/30">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl border border-white/10 bg-black p-6 sm:p-8 min-h-[280px] flex flex-col cursor-pointer select-none"
            onClick={() => { if (!flipped) { setFlipped(true); setShowHint(false); } }}
          >
            {flipped ? (
              <div className="flex-1 flex flex-col">
                <div className="text-[10px] uppercase tracking-wider text-emerald-400/70 mb-3 font-semibold">Answer</div>
                <div className="flex-1">
                  <p className="text-lg sm:text-xl text-white leading-relaxed whitespace-pre-wrap">{card.back}</p>
                </div>
                {card.hint && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                    className="mt-4 flex items-center gap-1.5 text-[11px] text-amber-300/60 hover:text-amber-300 transition-colors"
                  >
                    <Lightbulb className="h-3.5 w-3.5" /> {showHint ? "Hide hint" : "Show hint"}
                  </button>
                )}
                {showHint && card.hint && (
                  <p className="mt-2 text-xs text-amber-200/60 italic border-l-2 border-amber-400/30 pl-3">
                    {card.hint}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] uppercase tracking-wider text-white/30 mb-4 font-semibold">Tap to reveal</p>
                <p className="text-xl sm:text-2xl text-white font-medium leading-relaxed">{card.front}</p>
              </div>
            )}
          </div>

          {/* Rating buttons — only after flip */}
          {flipped && (
            <div className="mt-6 grid grid-cols-4 gap-2">
              <button
                onClick={() => rateCard(0)}
                className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 sm:p-4 text-center hover:bg-rose-500/20 transition-colors"
              >
                <XCircle className="h-5 w-5 text-rose-400 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-rose-300">Again</p>
                <p className="text-[8px] text-rose-400/60">&lt;1 min</p>
              </button>
              <button
                onClick={() => rateCard(2)}
                className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 sm:p-4 text-center hover:bg-amber-500/20 transition-colors"
              >
                <Clock className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-amber-300">Hard</p>
                <p className="text-[8px] text-amber-400/60">~1 day</p>
              </button>
              <button
                onClick={() => rateCard(3)}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 sm:p-4 text-center hover:bg-emerald-500/20 transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-emerald-300">Good</p>
                <p className="text-[8px] text-emerald-400/60">~6 days</p>
              </button>
              <button
                onClick={() => rateCard(5)}
                className="rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 sm:p-4 text-center hover:bg-sky-500/20 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-sky-400 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-sky-300">Easy</p>
                <p className="text-[8px] text-sky-400/60">~15 days</p>
              </button>
            </div>
          )}

          {/* Progress dots */}
          {reviewQueue.length > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6 flex-wrap">
              {reviewQueue.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === reviewIndex
                      ? "w-4 bg-emerald-400"
                      : i < reviewIndex
                        ? "w-1.5 bg-emerald-400/40"
                        : "w-1.5 bg-white/10"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}