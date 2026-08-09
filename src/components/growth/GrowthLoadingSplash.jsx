import React from "react";
import { Flame } from "lucide-react";
import { THEMES } from "@/lib/themes";

// Loading splash for Haven Growth, shown while the Growth module's data loads.
// Locked to the orange "sunset" palette to match the Growth module's amber brand.
export default function GrowthLoadingSplash() {
  const t = THEMES.sunset;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center p-6"
      style={{
        color: t.text,
        background: `radial-gradient(120% 120% at 50% 0%, ${t.surface} 0%, ${t.bg} 60%, #000000 100%)`,
      }}
    >
      {/* drifting ambient blobs — themed */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}33, transparent 70%)`, animation: "splash-float 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full" style={{ background: `radial-gradient(circle, ${t.secondary}2a, transparent 70%)`, animation: "splash-float 12s ease-in-out infinite", animationDelay: "1.2s" }} />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="splash-logo-in inline-flex items-center justify-center rounded-2xl border"
          style={{ height: 64, width: 64, borderColor: `${t.primary}4d`, background: `${t.primary}1a` }}
        >
          <Flame style={{ height: 32, width: 32, color: t.primary }} />
        </div>
        <span className="splash-fade-up mt-4 font-semibold tracking-tight" style={{ fontSize: 28, color: t.text, animationDelay: "0.4s" }}>
          Haven <span style={{ color: t.primary }}>Growth</span>
        </span>
        <p className="splash-fade-up mt-2 text-sm" style={{ color: t.muted, animationDelay: "0.6s" }}>Your growth. Unstoppable.</p>
        <div className="splash-fade-up mt-8 flex items-center gap-2" style={{ animationDelay: "0.7s" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ background: t.primary, animation: "dd-dot 1.1s ease-in-out infinite", animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}