import React from "react";
import { Palette, Check } from "lucide-react";
import { THEME_KEYS, THEMES, DEFAULT_THEME } from "@/lib/themes";

// Theme picker for Haven Finance and Haven Education. Renders the 5 theme
// cards from the centralized themes map, applies the selection instantly via
// onChange (which persists to the user's profile / edu settings), and shows an
// active checkmark on the current theme.

export default function ThemeSettings({ currentTheme, onChange }) {
  const current = THEMES[currentTheme] ? currentTheme : DEFAULT_THEME;

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-1">
        <Palette className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Appearance · Theme</h3>
      </div>
      <p className="text-xs text-white/40 mb-4">
        Pick a theme — it applies instantly and is saved to your account for next time.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEME_KEYS.map((key) => {
          const t = THEMES[key];
          const active = key === current;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`group relative text-left rounded-xl border p-3 transition-colors overflow-hidden ${
                active
                  ? "border-emerald-400/50 ring-1 ring-emerald-400/40"
                  : "border-white/10 hover:border-white/30"
              }`}
              style={{ background: t.surface }}
            >
              {/* mini preview: bg + two accent circles */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="h-7 w-7 rounded-full border"
                  style={{ background: t.bg, borderColor: t.border }}
                />
                <span className="h-5 w-5 rounded-full" style={{ background: t.primary }} />
                <span className="h-5 w-5 rounded-full" style={{ background: t.secondary }} />
              </div>

              <p className="text-sm font-semibold leading-tight" style={{ color: t.text }}>
                {t.label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: t.muted }}>
                {t.tagline}
              </p>

              {active && (
                <span
                  className="absolute top-2 right-2 h-5 w-5 grid place-items-center rounded-full"
                  style={{ background: t.primary, color: t.surface }}
                >
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}