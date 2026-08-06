// sessionStorage-backed draft so a refresh mid-wizard won't lose progress.
const KEY = "haven_onboarding_draft_v1";
const SKIP_KEY = "finance_profile_completed";

export function loadDraft() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDraft(draft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// Skip-not-re-prompt: once the user dismisses/skips Finance setup, the gate
// stops auto-showing the wizard. They can still re-run it from /setup.
export function isFinanceProfileAddressed() {
  try { return localStorage.getItem(SKIP_KEY) === "true"; } catch { return false; }
}

export function markFinanceProfileSkipped() {
  try { localStorage.setItem(SKIP_KEY, "true"); } catch {}
}