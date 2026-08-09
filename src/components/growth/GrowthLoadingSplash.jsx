import React from "react";
import { ShieldCheck } from "lucide-react";

// Loading splash for Haven Growth. Amber-on-black to match the Growth brand
// accent used across the module (ShieldCheck / Flame amber-300/400).
export default function GrowthLoadingSplash() {
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden text-white flex flex-col items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #2d1b14 0%, #1a0f0a 60%, #000000 100%)",
      }}
    >
      {/* Drifting ambient blobs — amber */}
      <div
        className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full animate-pulse"
        style={{ background: "radial-gradient(circle, #f59e0b22, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full"
        style={{ background: "radial-gradient(circle, #f973161a, transparent 70%)" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <div
          className="inline-flex items-center justify-center rounded-2xl border h-16 w-16 splash-logo-in"
          style={{ borderColor: "#f59e0b4d", background: "#f59e0b1a" }}
        >
          <ShieldCheck className="h-8 w-8 text-amber-400" />
        </div>

        <div className="space-y-1.5 splash-fade-up">
          <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-amber-400">
            Haven
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">Growth</h1>
        </div>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5 pt-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-amber-400"
              style={{
                animation: "dd-dot 1.1s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}