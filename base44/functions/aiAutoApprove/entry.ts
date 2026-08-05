import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Deterministic "AI critical-thinking" duplicate review for imported statements.
// No external AI call — pure comparison logic so it is fast and reproducible.
//
// Rules implemented (per the AI Auto-Approve spec):
//  - Card payments ("PAYMENT - THANK YOU" / type debt_payment) are never
//    duplicates of purchases → always approved.
//  - Known subscription/recurring services are never duplicates → approved,
//    even at identical monthly amounts.
//  - Same merchant + same amount on DIFFERENT days = a legitimate recurring or
//    week-apart purchase → approved (consecutive-day daily purchases, same-week
//    repeats, 30+ day monthly charges all fall here).
//  - Slightly different amounts ($4.52 vs $4.78) are different purchases — they
//    never match because we require an amount delta < $0.05 to even consider a
//    pair, so they are approved automatically.
//  - True duplicate = SAME merchant + SAME amount + SAME exact date (date delta
//    0) AND not an exempt subscription/payment. That one is flagged (skipped);
//    the earlier row is kept. Ambiguous cases default to KEEP (approve).
//
// Input:  { pending: [...], existing: [...] }
// Output: { approved: [...rows], flagged: [{ index, reason }] }
//   - `approved` are the pending rows to commit (returned for completeness; the
//     frontend commits them through the existing import path so account/liability
//     balance effects stay consistent).
//   - `flagged` references the pending array by index with a human reason.

const PROVINCES = new Set(["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"]);
const STOPWORDS = new Set([
  "phone","app","appl","pay","gpay","ltd","inc","llc","pty","thank","you",
  "paiement","merci","payment","the","and","primary","transfer","online","bill"
]);
const SUBSCRIPTIONS = [
  "spotify","apple.com/bill","netflix","icloud","google storage","google one",
  "youtube premium","youtube music","disney","amazon prime","crunch","goodlife",
  "planet fitness","la fitness","ymca","adobe","microsoft 365","office 365",
  "dropbox","linkedin","github","notion","1password","headspace","calm","audible",
  "washington post","new york times","chatgpt","openai","patreon","substack",
  "evernote","nordvpn","expressvpn","dazn","mlb.tv","rogers","bell","telus"
];

function isCardPayment(text) {
  return /payment\s*-\s*thank you|thank\s*you|paiement\s*-\s*merci/i.test(text || "");
}

function normTokens(s) {
  if (!s) return [];
  let t = String(s).toLowerCase();
  t = t.replace(/\*+/g, " ");
  t = t.replace(/\b\d{4,}\b/g, " ");
  t = t.replace(/[.,;:|/\\()\[\]-]+/g, " ");
  return t
    .split(/\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !PROVINCES.has(x.toUpperCase()))
    .filter((x) => !STOPWORDS.has(x))
    .filter((x) => x.length >= 3);
}

function isSubscription(desc) {
  const d = (desc || "").toLowerCase();
  return SUBSCRIPTIONS.some((k) => d.includes(k));
}

function sameAmount(a, b) {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.05;
}

function dayDiff(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da) || isNaN(db)) return Infinity;
  return Math.abs(Math.round((da - db) / 86400000));
}

function reviewBatch(pending, existing) {
  const approved = [];
  const flagged = [];
  const existingLen = (existing || []).length;

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i] || {};
    const desc = row.description || "";
    const type = row.type || "expense";
    const amt = Math.abs(Number(row.amount) || 0);
    const date = row.date || "";

    // Exemptions: card payments and known recurring services are never
    // duplicates — always approve them.
    const exempt = isCardPayment(desc) || type === "debt_payment" || isSubscription(desc);

    // Candidates = existing transactions in the log + earlier rows in this
    // same import (catches double-scanned rows within one statement).
    const candidates = [...(existing || []), ...pending.slice(0, i)];

    let flagReason = null;
    if (!exempt && amt > 0) {
      const rowTokens = normTokens(desc);
      for (let c = 0; c < candidates.length; c++) {
        const cand = candidates[c];
        if (!cand) continue;
        if (!sameAmount(amt, cand.amount)) continue;
        // Only an EXACT same-day match is treated as a true duplicate; anything
        // a day or more apart leans KEEP (recurring/daily/weekly/monthly).
        if (dayDiff(date, cand.date) !== 0) continue;
        const cTokens = normTokens(cand.description);
        if (!rowTokens.length || !cTokens.length) continue;
        if (!cTokens.some((t) => rowTokens.includes(t))) continue;
        flagReason = c < existingLen
          ? "Same merchant, amount, and date as an existing transaction — likely already imported"
          : "Same merchant, amount, and date as an earlier row in this import — likely duplicate";
        break;
      }
    }

    if (flagReason) {
      flagged.push({ index: i, reason: flagReason });
    } else {
      approved.push(row);
    }
  }

  return { approved, flagged };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const pending = Array.isArray(body?.pending) ? body.pending : [];
    const existing = Array.isArray(body?.existing) ? body.existing : [];

    const result = reviewBatch(pending, existing);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}