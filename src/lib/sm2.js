/**
 * SM-2 Spaced Repetition Algorithm
 * 
 * Based on SuperMemo SM-2 by Piotr Wozniak.
 * 
 * Grading scale (quality of response):
 * 0 - Complete blackout, no recall
 * 1 - Incorrect, but upon seeing the answer it felt familiar
 * 2 - Incorrect, but the answer seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct after hesitation
 * 5 - Perfect recall
 *
 * @param {number} quality - User's self-assessed recall quality (0-5)
 * @param {object} card - Current card state { easiness, interval, repetitions }
 * @returns {object} Updated card state { easiness, interval, repetitions, nextReview }
 */

const MIN_EASINESS = 1.3;
const MAX_INTERVAL = 365; // 1 year cap

export function sm2Calculate(quality, card) {
  const { easiness = 2.5, interval = 0, repetitions = 0 } = card;
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  // Update easiness factor
  let newEF = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  newEF = Math.max(MIN_EASINESS, newEF);

  let newInterval;
  let newReps;
  let nextReview;

  if (q >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEF);
    }
    newReps = repetitions + 1;
  } else {
    // Incorrect response — reset
    newInterval = 1;
    newReps = 0;
  }

  // Cap max interval
  newInterval = Math.min(MAX_INTERVAL, newInterval);

  // Calculate next review date
  const now = new Date();
  now.setDate(now.getDate() + newInterval);
  nextReview = now.toISOString().slice(0, 10);

  return {
    easiness: Math.round(newEF * 100) / 100,
    interval: newInterval,
    repetitions: newReps,
    nextReview,
    lastReviewed: new Date().toISOString(),
  };
}

/**
 * Get cards due for review from a list of cards.
 * @param {Array} cards - Array of card objects with next_review
 * @returns {Array} Cards due today or earlier
 */
export function getCardsDue(cards) {
  const today = new Date().toISOString().slice(0, 10);
  return (cards || []).filter(
    (c) => !c.next_review || c.next_review <= today
  );
}

/**
 * Sort cards by review priority: overdue first, then by easiness (hardest first).
 * @param {Array} cards
 * @returns {Array} Sorted cards
 */
export function sortByPriority(cards) {
  return [...(cards || [])].sort((a, b) => {
    const aDate = a.next_review || "2000-01-01";
    const bDate = b.next_review || "2000-01-01";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return (a.easiness || 2.5) - (b.easiness || 2.5);
  });
}

/**
 * Format next review date for display.
 */
export function formatNextReview(dateStr) {
  if (!dateStr) return "Due now";
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr <= today) return "Due now";
  const d = new Date(dateStr);
  const diff = Math.round((d - new Date()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 7) return `In ${diff} days`;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

/**
 * Get a color for the card based on SM-2 state.
 */
export function cardStateColor(card) {
  if (!card) return "border-white/10";
  const today = new Date().toISOString().slice(0, 10);
  if (card.next_review && card.next_review <= today) {
    if (card.repetitions === 0) return "border-rose-400/40 bg-rose-500/10";
    return "border-amber-400/40 bg-amber-500/10";
  }
  if (card.repetitions >= 5) return "border-emerald-400/20 bg-emerald-500/5";
  return "border-white/10 bg-black";
}

/**
 * Calculate retention estimate based on SM-2 parameters.
 */
export function retentionEstimate(card) {
  const ef = card.easiness || 2.5;
  // Approximate retention: R = e^(-interval/EF)
  const interval = card.interval || 0;
  if (interval <= 0) return 0;
  return Math.round(Math.exp(-interval / (ef * 10)) * 100);
}