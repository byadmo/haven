/**
 * XP & Leveling System for Haven Education
 *
 * XP earned per study session: duration_minutes * XP_PER_MINUTE
 * Level formula: level = floor(sqrt(totalXP / LEVEL_BASE)) + 1
 * XP needed for next level: (currentLevel)^2 * LEVEL_BASE
 */

const XP_PER_MINUTE = 10;
const LEVEL_BASE = 100;

/**
 * Calculate level from total XP.
 * @param {number} totalXP
 * @returns {{ level: number, xpInLevel: number, xpForNext: number, progress: number }}
 */
export function calculateLevel(totalXP) {
  const xp = Math.max(0, totalXP);
  const level = Math.floor(Math.sqrt(xp / LEVEL_BASE)) + 1;
  const xpForCurrent = (level - 1) ** 2 * LEVEL_BASE;
  const xpForNext = level ** 2 * LEVEL_BASE;
  const xpInLevel = xp - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;
  const progress = xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
  return { level, xpInLevel, xpForNext: xpNeeded, xpForCurrent, totalXP: xp, progress };
}

/**
 * Calculate study time-based XP from a list of study sessions.
 * @param {Array} studySessions
 * @returns {number} Total XP earned
 */
export function totalStudyXP(studySessions) {
  return (studySessions || []).reduce(
    (sum, s) => sum + (s.duration_minutes || 0) * XP_PER_MINUTE,
    0
  );
}

/**
 * Get level title/name based on level number.
 */
export function levelTitle(level) {
  if (level >= 50) return "Grand Master";
  if (level >= 40) return "Scholar";
  if (level >= 30) return "Professor";
  if (level >= 25) return "Doctorate";
  if (level >= 20) return "Honours";
  if (level >= 15) return "Dean's List";
  if (level >= 10) return "Advanced";
  if (level >= 7) return "Intermediate";
  if (level >= 4) return "Apprentice";
  if (level >= 2) return "Novice";
  return "Beginner";
}

/**
 * Get icon/emoji for the player's level.
 */
export function levelEmoji(level) {
  if (level >= 50) return "👑";
  if (level >= 40) return "🏆";
  if (level >= 30) return "🎓";
  if (level >= 25) return "⚜️";
  if (level >= 20) return "⭐";
  if (level >= 15) return "🌟";
  if (level >= 10) return "💎";
  if (level >= 7) return "📚";
  if (level >= 4) return "📖";
  if (level >= 2) return "✨";
  return "🌱";
}