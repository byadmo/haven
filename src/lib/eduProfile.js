// Education profile + education-specific localStorage helpers.
const PROFILE_KEY = "edusync_profile";
const COMPLETED_KEY = "edusync_profile_completed";
const SPLASH_KEY = "eduSplashShown";

export const EDU_LOCAL_KEYS = [PROFILE_KEY, COMPLETED_KEY, SPLASH_KEY];

export function getProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null; } catch { return null; }
}

// Has the user addressed setup at all (completed OR skipped)? Drives the
// auto-trigger gate on Education entry.
export function isProfileAddressed() {
  try { return localStorage.getItem(COMPLETED_KEY) === "true"; } catch { return false; }
}

// Did they actually fill in the profile? Drives the "Profile Complete" badge.
export function isProfileComplete() {
  try {
    return isProfileAddressed() && !!getProfile()?.completed;
  } catch { return false; }
}

export function markProfileSkipped() {
  try { localStorage.setItem(COMPLETED_KEY, "true"); } catch {}
}

export function saveProfile(data) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...data, completed: true }));
    localStorage.setItem(COMPLETED_KEY, "true");
  } catch {}
}

// Reset Education Data: clear only the stored profile object (keep the
// "completed" flag so we don't re-trigger the wizard unexpectedly).
export function clearEduData() {
  try { localStorage.removeItem(PROFILE_KEY); } catch {}
}

// Delete Education Account: wipe every education-specific localStorage key.
export function clearEduProfile() {
  try { EDU_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k)); } catch {}
}