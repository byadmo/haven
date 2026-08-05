import React, { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Branded launch screen shown briefly before the main Haven dashboard.
 * Not an auth gate — the user is already logged in. Fades out after a short
 * hold so the dashboard (rendering underneath) is revealed smoothly.
 * Uses the original teal/emerald Haven logo treatment with a radial gradient
 * backdrop and drifting ambient blobs.
 */
export default function LaunchIntro({ hold = 1500, fade = 480, onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), hold);
    const t2 = setTimeout(() => onDone?.(), hold + fade);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [hold, fade, onDone]);

  return (
    <div
      className={`fixed inset-0 z-[80] overflow-hidden bg-black transition-opacity duration-500 ${leaving ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{
        background: "radial-gradient(120% 120% at 50% 0%, #052e25 0%, #000 55%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* drifting ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)", animation: "splash-float 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(13,148,136,0.16), transparent 70%)", animation: "splash-float 12s ease-in-out infinite", animationDelay: "1.5s" }} />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.12), transparent 70%)", animation: "splash-float 11s ease-in-out infinite", animationDelay: "0.8s" }} />

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 text-center">
        <div className="splash-logo-in">
          <Logo />
        </div>
        <p className="splash-fade-up mt-6 text-lg font-medium text-white/90" style={{ animationDelay: "0.5s" }}>Your money. Under control.</p>

        <div className="mt-8 splash-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 rounded-full border-2 border-white/15 border-t-emerald-400 animate-spin" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10" style={{ height: 60, width: 60 }}>
        <ShieldCheck className="text-emerald-400" style={{ height: 30, width: 30 }} />
      </div>
      <span className="mt-3 font-semibold tracking-tight text-white" style={{ fontSize: 30 }}>Haven</span>
    </div>
  );
}