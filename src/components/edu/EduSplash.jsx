import React, { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { THEMES, DEFAULT_THEME, getStoredTheme } from "@/lib/themes";

export default function EduSplash({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const t = THEMES[getStoredTheme("education")] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1200);
    const t2 = setTimeout(() => onDone(), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center transition-opacity duration-320 ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{
        color: t.text,
        background: `radial-gradient(120% 120% at 50% 0%, ${t.surface} 0%, ${t.bg} 60%, #000000 100%)`,
      }}
    >
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}33, transparent 70%)`, animation: "splash-float 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-80 w-80 rounded-full" style={{ background: `radial-gradient(circle, ${t.secondary}2a, transparent 70%)`, animation: "splash-float 12s ease-in-out infinite", animationDelay: "1.5s" }} />

      <div className="relative z-10 flex flex-col items-center">
        <div
          className="splash-logo-in flex items-center justify-center rounded-2xl border"
          style={{ height: 64, width: 64, borderColor: `${t.primary}4d`, background: `${t.primary}1a` }}
        >
          <GraduationCap style={{ height: 32, width: 32, color: t.primary }} />
        </div>
        <span className="splash-fade-up mt-4 font-semibold tracking-tight" style={{ fontSize: 28, color: t.text, animationDelay: "0.4s" }}>
          Haven <span style={{ color: t.primary }}>Education</span>
        </span>
        <p className="splash-fade-up mt-2 text-sm" style={{ color: t.muted, animationDelay: "0.6s" }}>Your semester. Organized.</p>
        <div className="splash-fade-up mt-8 flex items-center gap-2" style={{ animationDelay: "0.9s" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ background: t.primary, animation: "dd-dot 1s ease-in-out infinite", animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}