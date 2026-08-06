import React from "react";
import { applyTheme, DEFAULT_THEME, setStoredTheme } from "@/lib/themes";

// Applies a theme to the document root (documentElement) so every surface —
// including Radix-ported dialogs, menus, and tooltips (which portal to <body>)
// — inherits the theme variables. On unmount the theme is reverted so auth /
// standalone routes keep the default black canvas. Both sub-apps mount their
// own ThemeRoot; only one is mounted at a time (routes are mutually exclusive),
// so the visible sub-app's theme always wins.

export default function ThemeRoot({ theme, app, className, style, children }) {
  const key = theme || DEFAULT_THEME;

  React.useEffect(() => {
    const el = document.documentElement;
    applyTheme(el, key);
    if (app) setStoredTheme(app, key);
    return () => {
      const e = document.documentElement;
      [
        "--th-bg", "--th-surface", "--th-primary", "--th-secondary",
        "--th-text", "--th-muted", "--th-border", "--th-success", "--th-danger",
        "--th-chart-1", "--th-chart-2", "--th-chart-3", "--th-chart-4",
      ].forEach((v) => e.style.removeProperty(v));
      ["--e-200", "--e-300", "--e-400", "--e-500", "--e-600"].forEach((v) => e.style.removeProperty(v));
      e.removeAttribute("data-theme");
      e.removeAttribute("data-tint");
    };
  }, [key, app]);

  return <div className={className} style={style}>{children}</div>;
}