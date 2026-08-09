import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { THEMES, DEFAULT_THEME, getStoredTheme } from "@/lib/themes";

/**
 * Branded launch screen shown briefly before the main Haven Finance dashboard.
 * Not an auth gate — the user is already logged in. Fades out after a short
 * hold so the dashboard (rendering underneath) is revealed smoothly.
 * Colors follow the user's chosen Haven Finance theme.
 */
export default function LaunchIntro({ hold = 1200, fade = 300, onDone }) {
  const [leaving, setLeaving] = useState(false);
  const t = THEMES[getStoredTheme("finance")] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), hold);
    const t2 = setTimeout(() => onDone?.(), hold + fade);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [hold, fade, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[80] overflow-hidden transition-opacity duration-500 ${leaving ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{
        color: t.text,
        background: `radial-gradient(120% 120% at 50% 0%, ${t.surface} 0%, ${t.bg} 55%, #000000 100%)`,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* drifting ambient blobs — themed */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}33, transparent 70%)`, animation: "splash-float 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-80 w-80 rounded-full" style={{ background: `radial-gradient(circle, ${t.secondary}2a, transparent 70%)`, animation: "splash-float 12s ease-in-out infinite", animationDelay: "1.5s" }} />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}22, transparent 70%)`, animation: "splash-float 11s ease-in-out infinite", animationDelay: "0.8s" }} />

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 text-center">
        <div className="splash-logo-in">
          <div className="flex items-center justify-center rounded-2xl border" style={{ height: 60, width: 60, borderColor: `${t.primary}4d`, background: `${t.primary}1a` }}>
            <ShieldCheck style={{ height: 30, width: 30, color: t.primary }} />
          </div>
        </div>
        <span className="splash-fade-up mt-3 font-semibold tracking-tight" style={{ fontSize: 30, color: t.text, animationDelay: "0.3s" }}>
          Haven <span style={{ color: t.primary }}>Financial</span>
        </span>
        <p className="splash-fade-up mt-6 text-lg font-medium" style={{ color: t.muted, animationDelay: "0.5s" }}>Your money. Under control.</p>

        <div className="mt-8 splash-fade-in flex items-center gap-1.5" style={{ animationDelay: "0.7s" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2 w-2 rounded-full" style={{ background: t.primary, animation: "dd-dot 1s ease-in-out infinite", animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}