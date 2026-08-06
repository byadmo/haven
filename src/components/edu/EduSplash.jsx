import React, { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

export default function EduSplash({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1200);
    const t2 = setTimeout(() => onDone(), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black transition-opacity duration-320 ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ background: "radial-gradient(120% 120% at 50% 0%, #042f2e 0%, #000 55%)" }}
    >
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)", animation: "splash-float 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(13,148,136,0.16), transparent 70%)", animation: "splash-float 12s ease-in-out infinite", animationDelay: "1.5s" }} />

      <div className="relative z-10 flex flex-col items-center">
        <div className="splash-logo-in flex items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10" style={{ height: 64, width: 64 }}>
          <GraduationCap className="text-emerald-400" style={{ height: 32, width: 32 }} />
        </div>
        <span className="splash-fade-up mt-4 font-semibold tracking-tight text-white" style={{ fontSize: 28, animationDelay: "0.4s" }}>
          Haven <span className="text-emerald-400">Education</span>
        </span>
        <p className="splash-fade-up mt-2 text-sm text-white/40" style={{ animationDelay: "0.6s" }}>Your semester, organized.</p>
        <div className="splash-fade-up mt-8 flex items-center gap-2" style={{ animationDelay: "0.9s" }}>
          <div className="h-2 w-2 rounded-full bg-emerald-400" style={{ animation: "dd-dot 1s ease-in-out infinite" }} />
          <div className="h-2 w-2 rounded-full bg-emerald-400" style={{ animation: "dd-dot 1s ease-in-out infinite", animationDelay: "0.18s" }} />
          <div className="h-2 w-2 rounded-full bg-emerald-400" style={{ animation: "dd-dot 1s ease-in-out infinite", animationDelay: "0.36s" }} />
        </div>
      </div>
    </div>
  );
}