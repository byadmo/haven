// Theme system for Haven Finance & Haven Education. Each theme defines a full
// palette exposed as CSS custom properties (--th-*) plus the emerald accent
// channels (--e-*) so every existing emerald-based accent follows the chosen
// primary automatically. See src/components/ThemeRoot.jsx for application.

export const DEFAULT_THEME = "wealthsimple";

export const THEME_KEYS = ["original", "midnight", "daylight", "cottonCandy", "forest", "sunset", "wealthsimple"];

export const THEMES = {
  // Original: the pre-theme-system look — true-black canvas (the telemetry
  // overrides), white/opacity text, hairline white borders, and the native
  // per-sub-app accent (emerald for Education, indigo for Finance) left intact.
  // `nativeAccent` tells applyTheme to skip the --e-* override so the .finance-accent
  // class and default emerald channels keep working exactly as before.
  original: {
    key: "original",
    label: "Original",
    tagline: "Classic black",
    tint: "dark",
    nativeAccent: true,
    bg: "#000000",
    surface: "#000000",
    primary: "#10b981",
    secondary: "#059669",
    text: "#ffffff",
    muted: "rgba(255, 255, 255, 0.5)",
    border: "rgba(255, 255, 255, 0.10)",
    success: "#22c55e",
    danger: "#ef4444",
    charts: ["#10b981", "#6366f1", "#f59e0b", "#ec4899"],
  },
  midnight: {
    key: "midnight",
    label: "Midnight",
    tagline: "Default dark",
    tint: "dark",
    bg: "#0a0a0a",
    surface: "#1a1a2e",
    primary: "#4f46e5",
    secondary: "#7c3aed",
    text: "#ffffff",
    muted: "#a1a1aa",
    border: "#27272a",
    success: "#22c55e",
    danger: "#ef4444",
    charts: ["#4f46e5", "#7c3aed", "#3b82f6", "#06b6d4"],
  },
  daylight: {
    key: "daylight",
    label: "Daylight",
    tagline: "Clean light",
    tint: "light",
    bg: "#f8fafc",
    surface: "#ffffff",
    primary: "#4f46e5",
    secondary: "#0ea5e9",
    text: "#1e293b",
    muted: "#64748b",
    border: "#e2e8f0",
    success: "#16a34a",
    danger: "#dc2626",
    charts: ["#4f46e5", "#0ea5e9", "#14b8a6", "#f59e0b"],
  },
  cottonCandy: {
    key: "cottonCandy",
    label: "Cotton Candy",
    tagline: "Playful pastel",
    tint: "dark",
    bg: "#1a0a1e",
    surface: "#2d1b3d",
    primary: "#ec4899",
    secondary: "#818cf8",
    text: "#fce7f3",
    muted: "#c4b5fd",
    border: "#4c1d95",
    success: "#34d399",
    danger: "#fb7185",
    charts: ["#ec4899", "#818cf8", "#34d399", "#fed7aa"],
  },
  forest: {
    key: "forest",
    label: "Forest",
    tagline: "Earthy green",
    tint: "dark",
    bg: "#0c1a0c",
    surface: "#1a2e1a",
    primary: "#22c55e",
    secondary: "#84cc16",
    text: "#f0fdf4",
    muted: "#86efac",
    border: "#166534",
    success: "#4ade80",
    danger: "#f87171",
    charts: ["#22c55e", "#84cc16", "#14b8a6", "#f59e0b"],
  },
  sunset: {
    key: "sunset",
    label: "Sunset",
    tagline: "Warm orange",
    tint: "dark",
    bg: "#1a0f0a",
    surface: "#2d1b14",
    primary: "#f97316",
    secondary: "#ef4444",
    text: "#fff7ed",
    muted: "#fed7aa",
    border: "#7c2d12",
    success: "#84cc16",
    danger: "#dc2626",
    charts: ["#f97316", "#ef4444", "#f59e0b", "#facc15"],
  },
  // ── WealthSimple-Inspired ──────────────────────────────────────────
  // Deep navy canvas, signature teal accent, clean sans-serif feel.
  // Matches the WealthSimple fintech aesthetic — premium, trustworthy, airy.
  wealthsimple: {
    key: "wealthsimple",
    label: "WealthSimple",
    tagline: "Clean fintech",
    tint: "dark",
    bg: "#0B1426",
    surface: "#131D33",
    primary: "#00E5A0",
    secondary: "#3B82F6",
    text: "#E8EEF4",
    muted: "rgba(232, 238, 244, 0.50)",
    border: "rgba(255, 255, 255, 0.08)",
    success: "#00E5A0",
    danger: "#FF4D4D",
    charts: ["#00E5A0", "#3B82F6", "#F59E0B", "#A78BFA"],
  },
};

function normalize(key) {
  return THEMES[key] ? key : DEFAULT_THEME;
}

// Convert #rrggbb -> "r g b" channel string for the tailwind emerald rgb() vars.
function hexToChannels(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Convert #rrggbb -> "H S% L%" channel string for the shadcn hsl(var(--token))
// tokens (primary, destructive, ring) so Button CTAs follow the theme accent.
function hexToHSL(hex) {
  const h = hex.replace("#", "");
  let r = parseInt(h.slice(0, 2), 16) / 255;
  let g = parseInt(h.slice(2, 4), 16) / 255;
  let b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      case b: hue = (r - g) / d + 4; break;
    }
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

// Apply a theme's CSS variables to a root element (scoped to its subtree).
// Setting vars on the element scopes them to descendants, so each sub-app can
// carry its own theme independently.
export function applyTheme(el, key) {
  if (!el || typeof document === "undefined") return;
  const t = THEMES[normalize(key)];
  const s = el.style;
  s.setProperty("--th-bg", t.bg);
  s.setProperty("--th-surface", t.surface);
  s.setProperty("--th-primary", t.primary);
  s.setProperty("--th-secondary", t.secondary);
  s.setProperty("--th-text", t.text);
  s.setProperty("--th-muted", t.muted);
  s.setProperty("--th-border", t.border);
  s.setProperty("--th-success", t.success);
  s.setProperty("--th-danger", t.danger);
  t.charts.forEach((c, i) => s.setProperty(`--th-chart-${i + 1}`, c));
  // Emerald accent scale follows the theme primary (300/200 lean on secondary
  // for depth) so every emerald-* utility recolors with the theme automatically.
  // The "original" theme keeps the native per-sub-app accents (emerald/indigo
  // via .finance-accent) untouched, so we skip the override entirely.
  if (!t.nativeAccent) {
    const prim = hexToChannels(t.primary);
    const sec = hexToChannels(t.secondary);
    s.setProperty("--e-200", sec);
    s.setProperty("--e-300", sec);
    s.setProperty("--e-400", prim);
    s.setProperty("--e-500", prim);
    s.setProperty("--e-600", prim);
    // Shadcn button tokens: primary/destructive CTAs and focus rings follow
    // the theme accent so buttons integrate with the chosen palette. The
    // "original" theme skips this to keep its native white-on-black buttons.
    const ph = hexToHSL(t.primary);
    s.setProperty("--primary", ph);
    s.setProperty("--primary-foreground", "0 0% 100%");
    s.setProperty("--ring", ph);
    const dh = hexToHSL(t.danger);
    s.setProperty("--destructive", dh);
    s.setProperty("--destructive-foreground", "0 0% 100%");
  }
  el.setAttribute("data-theme", t.key);
  el.setAttribute("data-tint", t.tint);
}

// localStorage mirror so the Hub and cross-launch loads can apply the saved
// theme before the entity is fetched (avoids a flash of the default theme).
function storeKey(app) {
  return `haven:theme:${app}`;
}

export function getStoredTheme(app) {
  try {
    const v = localStorage.getItem(storeKey(app));
    return THEMES[v] ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setStoredTheme(app, key) {
  try {
    localStorage.setItem(storeKey(app), normalize(key));
  } catch {}
}