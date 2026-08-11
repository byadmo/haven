import { formatDistanceToNow, format, isToday, isTomorrow, isYesterday, isThisWeek, parseISO } from "date-fns";

/**
 * Format a date string relative to now.
 * "Due in 2 days", "Due tomorrow", "Overdue by 3 days", etc.
 */
export function relativeDate(dateStr, { prefix = "", suffix = "" } = {}) {
  if (!dateStr) return "—";
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  const now = new Date();

  if (isToday(d)) return `${prefix}Today${suffix}`.trim();
  if (isTomorrow(d)) return `${prefix}Tomorrow${suffix}`.trim();
  if (isYesterday(d)) return `${prefix}Yesterday${suffix}`.trim();

  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    if (abs === 1) return "Overdue by 1 day";
    return `Overdue by ${abs} days`;
  }
  if (diffDays === 0) return `${prefix}Today${suffix}`.trim();
  if (diffDays === 1) return `${prefix}Tomorrow${suffix}`.trim();
  if (diffDays < 7) return `${prefix}in ${diffDays} days${suffix}`.trim();
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${prefix}in ${weeks}w${suffix}`.trim();
  }
  return format(d, "MMM d, yyyy");
}

/**
 * Format a debt-free date as a motivational countdown.
 */
export function debtFreeCountdown(dateStr) {
  if (!dateStr) return null;
  const d = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs <= 0) return { years: 0, months: 0, days: 0, totalDays: 0, isFree: true };

  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = totalDays % 30;

  return { years, months, days, totalDays, isFree: false };
}