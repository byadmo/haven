// UI scale: a single multiplier that rescales the whole app (fonts, padding,
// spacing, rem-based chart heights) by driving the root font-size through the
// `--ui-scale` CSS custom property (see index.css). Persisted to localStorage
// and applied at import time so it takes effect before first paint.

const KEY = "haven:ui-scale";
export const UI_SCALE_MIN = 0.85;
export const UI_SCALE_MAX = 1.15;

export function clampUiScale(s) {
  const v = Number(s);
  if (!Number.isFinite(v)) return 1;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, v));
}

export function getUiScale() {
  try { return clampUiScale(parseFloat(localStorage.getItem(KEY))); } catch { return 1; }
}

export function applyUiScale(s) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--ui-scale", String(clampUiScale(s)));
}

export function setUiScale(s) {
  applyUiScale(s);
  try { localStorage.setItem(KEY, String(clampUiScale(s))); } catch {}
}

// Apply the saved preference as soon as this module loads.
applyUiScale(getUiScale());