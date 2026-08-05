import { parseISO, differenceInCalendarDays } from "date-fns";

// Two charges on the same card/account for the same amount within this many
// calendar days are treated as duplicates.
export const DUP_WINDOW_DAYS = 3;

function dayDiff(aDate, bDate) {
  const da = parseISO(aDate);
  const db = parseISO(bDate);
  if (isNaN(da) || isNaN(db)) return Infinity;
  return Math.abs(differenceInCalendarDays(da, db));
}

// True when `row` matches any row in `others` by same amount + same account
// within the 3-day window. Used for import-time duplicate flagging.
export function hasAmountWindowMatch(row, others, windowDays = DUP_WINDOW_DAYS) {
  const acct = row.account_id || "";
  if (!acct) return false;
  const amt = Number(row.amount) || 0;
  for (const o of others || []) {
    if ((Number(o.amount) || 0) !== amt) continue;
    if ((o.account_id || "") !== acct) continue;
    if (dayDiff(row.date, o.date) <= windowDays) return true;
  }
  return false;
}

// Tokens used to judge description/merchant similarity for import duplicate
// detection. Masks, reference numbers, province codes and channel/payment
// stopwords are stripped so "ROGERS *****1234 PHONE ON" and "ROGERS" compare
// as the same merchant.
const DUP_PROVINCES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"]);
const DUP_STOPWORDS = new Set(["phone", "app", "appl", "pay", "gpay", "ltd", "inc", "llc", "pty", "thank", "you", "paiement", "merci", "payment", "the", "and", "primary", "transfer"]);

function normDescTokens(s) {
  if (!s) return [];
  let t = String(s).toLowerCase();
  t = t.replace(/\*+/g, " ");
  t = t.replace(/\b\d{4,}\b/g, " ");
  t = t.replace(/[.,;:|/\\()\[\]-]+/g, " ");
  return t
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !DUP_PROVINCES.has(x.toUpperCase()))
    .filter((x) => !DUP_STOPWORDS.has(x))
    .filter((x) => x.length >= 3);
}

// Import-time duplicate check used by the statement review screen. A new row
// matches an existing/earlier row when the amount is equal, the date is within
// windowDays (±1 day per the import spec), and the cleaned merchant/description
// shares at least one significant token. If either side has no usable
// description tokens, an amount + date match is enough (a strong signal on its
// own). If both rows carry an account and they differ, they are never
// duplicates of each other.
export function isLikelyImportDuplicate(row, others, windowDays = 1) {
  const amt = Math.abs(Number(row.amount) || 0);
  if (!amt) return false;
  const rowTokens = normDescTokens(row.description);
  for (const o of others || []) {
    if (!o) continue;
    if (Math.abs(Number(o.amount) || 0) !== amt) continue;
    const aA = row.account_id || "";
    const aB = o.account_id || "";
    if (aA && aB && aA !== aB) continue;
    if (dayDiff(row.date, o.date) > windowDays) continue;
    const oTokens = normDescTokens(o.description);
    if (!rowTokens.length || !oTokens.length) return true;
    if (oTokens.some((t) => rowTokens.includes(t))) return true;
  }
  return false;
}

// Group all rows by (amount, account) and cluster consecutive rows whose dates
// fall within the 3-day window. Returns { groupIds, dupIds }:
//   groupIds — every member of a duplicate cluster (for highlighting)
//   dupIds  — all but the earliest member of each cluster (for removal/selection)
export function detectAmountWindowDuplicates(rows, windowDays = DUP_WINDOW_DAYS) {
  const byKey = {};
  for (const r of rows) {
    const k = `${Number(r.amount) || 0}|${r.account_id || ""}`;
    (byKey[k] ||= []).push(r);
  }
  const groupIds = new Set();
  const dupIds = new Set();
  for (const list of Object.values(byKey)) {
    const sorted = [...list]
      .filter((r) => r.id && !isNaN(parseISO(r.date)))
      .sort((a, b) => parseISO(a.date) - parseISO(b.date));
    let cluster = [];
    let last = null;
    const flush = () => {
      if (cluster.length > 1) {
        cluster.forEach((r) => groupIds.add(r.id));
        cluster.slice(1).forEach((r) => dupIds.add(r.id));
      }
      cluster = [];
    };
    for (const r of sorted) {
      const d = parseISO(r.date);
      if (cluster.length === 0 || (last !== null && differenceInCalendarDays(d, last) <= windowDays)) {
        cluster.push(r);
      } else {
        flush();
        cluster = [r];
      }
      last = d;
    }
    flush();
  }
  return { groupIds, dupIds };
}

// Returns an array of duplicate clusters (each an array of rows sorted by date,
// earliest first = the keeper). Only clusters with more than one member.
export function getDuplicateClusters(rows, windowDays = DUP_WINDOW_DAYS) {
  const byKey = {};
  for (const r of rows) {
    const k = `${Number(r.amount) || 0}|${r.account_id || ""}`;
    (byKey[k] ||= []).push(r);
  }
  const clusters = [];
  for (const list of Object.values(byKey)) {
    const sorted = [...list]
      .filter((r) => !isNaN(parseISO(r.date)))
      .sort((a, b) => parseISO(a.date) - parseISO(b.date));
    let cluster = [];
    let last = null;
    const flush = () => { if (cluster.length > 1) clusters.push(cluster); cluster = []; };
    for (const r of sorted) {
      const d = parseISO(r.date);
      if (cluster.length === 0 || (last !== null && differenceInCalendarDays(d, last) <= windowDays)) {
        cluster.push(r);
      } else {
        flush();
        cluster = [r];
      }
      last = d;
    }
    flush();
  }
  // Drop a cluster the user already chose to keep: every member carries the
  // same dup_keep_hash, so it should not surface as a duplicate again.
  return clusters.filter((cl, _i) => {
    const hashes = cl.map((r) => r.dup_keep_hash || "");
    const first = hashes[0];
    return !(first && hashes.every((h) => h === first));
  });
}

// Stable unique id for a kept group.
export function newKeepHash() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `keep-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}