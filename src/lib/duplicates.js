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