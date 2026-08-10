import React from "react";

/**
 * Shared entering "loading" splash used by every Haven sub-app (Finance,
 * Education, Growth). Identical layout, animation, and timing across all
 * three so the load-in feels consistent. Themed via the `palette` prop and
 * branded via `icon` / `accent` / `motto`.
 *
 * Entrance timings are inline (not the global splash-* classes) so this
 * splash's speed is controlled here without affecting other splash surfaces.
 */
export default function HavenLoadingSplash({ icon: Icon, accent, motto, palette: t }) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center p-6"
      style={{
        color: t.text,
        background: `radial-gradient(120% 120% at 50% 0%, ${t.surface} 0%, ${t.bg} 60%, #000000 100%)`,
      }}
    >
      {/* drifting ambient blobs — themed */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full"
        style={{ background: `radial-gradient(circle, ${t.primary}33, transparent 70%)`, animation: "splash-float 9s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full"
        style={{ background: `radial-gradient(circle, ${t.secondary}2a, transparent 70%)`, animation: "splash-float 12s ease-in-out infinite", animationDelay: "1.2s" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="inline-flex items-center justify-center rounded-2xl border"
          style={{
            height: 64,
            width: 64,
            borderColor: `${t.primary}4d`,
            background: `${t.primary}1a`,
            animation: "splash-logo-in 0.9s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <Icon style={{ height: 32, width: 32, color: t.primary }} />
        </div>
        <span
          className="mt-4 font-semibold tracking-tight"
          style={{ fontSize: 28, color: t.text, animation: "splash-fade-up 0.6s ease-out both", animationDelay: "0.35s" }}
        >
          Haven <span style={{ color: t.primary }}>{accent}</span>
        </span>
        <p
          className="mt-2 text-sm"
          style={{ color: t.muted, animation: "splash-fade-up 0.6s ease-out both", animationDelay: "0.55s" }}
        >
          {motto}
        </p>
        <div
          className="mt-8 flex items-center gap-2"
          style={{ animation: "splash-fade-up 0.6s ease-out both", animationDelay: "0.75s" }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ background: t.primary, animation: "dd-dot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Indigo brand palette — matches the Haven Financial Wallet icon and the
// module's indigo (.finance-accent) identity.
export const FINANCE_LOADING_PALETTE = {
  primary: "#6366f1",
  secondary: "#818cf8",
  bg: "#080812",
  surface: "#0d0d1f",
  text: "#ffffff",
  muted: "rgba(255, 255, 255, 0.5)",
};

// Emerald brand palette — matches the Haven Education GraduationCap icon and
// the module's emerald accent.
export const EDU_LOADING_PALETTE = {
  primary: "#10b981",
  secondary: "#34d399",
  bg: "#04120a",
  surface: "#0a1f14",
  text: "#ffffff",
  muted: "rgba(255, 255, 255, 0.5)",
};