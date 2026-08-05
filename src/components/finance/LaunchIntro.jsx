import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";

/**
 * Branded launch screen shown briefly before the main Haven dashboard.
 * Not an auth gate — the user is already logged in. Fades out after a short
 * hold so the dashboard (rendering underneath) is revealed smoothly.
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
      className={`fixed inset-0 z-[80] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${leaving ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="splash-logo-in flex flex-col items-center">
        <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-emerald-500 text-black mb-5">
          <Wallet className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold tracking-tight font-mono text-zinc-50">HAVEN</h1>
        <p className="mt-2 text-[11px] tracking-[0.2em] uppercase text-white/45">Your money. Under control.</p>
      </div>

      <div className="mt-8 flex gap-1.5">
        <Dot delay="0ms" />
        <Dot delay="160ms" />
        <Dot delay="320ms" />
      </div>
    </div>
  );
}

function Dot({ delay }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-emerald-400/80"
      style={{ animation: `dd-dot 1s ${delay} ease-in-out infinite` }}
    />
  );
}