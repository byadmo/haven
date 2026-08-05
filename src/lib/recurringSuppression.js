// Lightweight per-browser suppression store for the home "Upcoming & Recurring"
// widget. Lets the user remove an item from that box WITHOUT deleting the
// underlying transaction(s) (so statistics are unaffected). Deleting from
// history is a separate, destructive action handled by the caller.
//
// Stored locally rather than as an entity because suppression is a viewing
// preference, not financial data.

const STORAGE_KEY = "haven.suppression.v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { recurring: {}, transactions: {} };
    const parsed = JSON.parse(raw);
    return {
      recurring: parsed.recurring || {},
      transactions: parsed.transactions || {},
    };
  } catch {
    return { recurring: {}, transactions: {} };
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function isRecurringSuppressed(normalizedKey) {
  return !!load().recurring[normalizedKey];
}

export function suppressRecurring(normalizedKey) {
  const d = load();
  d.recurring[normalizedKey] = true;
  save(d);
}

export function isTransactionSuppressed(id) {
  return !!load().transactions[id];
}

export function suppressTransaction(id) {
  const d = load();
  d.transactions[id] = true;
  save(d);
}