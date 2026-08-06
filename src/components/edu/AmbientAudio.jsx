import React from "react";
import { Music, Waves, CloudRain } from "lucide-react";

const OPTIONS = [
  { id: "lofi", label: "Lofi", icon: Music, color: "text-violet-300" },
  { id: "white", label: "White Noise", icon: Waves, color: "text-sky-300" },
  { id: "rain", label: "Rain", icon: CloudRain, color: "text-cyan-300" },
];

export default function AmbientAudio() {
  const [enabled, setEnabled] = React.useState(false);
  const [mode, setMode] = React.useState("lofi");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const active = enabled && mode === o.id;
          return (
            <button
              key={o.id}
              onClick={() => { setMode(o.id); setEnabled(true); }}
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs transition-colors ${
                active ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-white/50 hover:text-white"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? "" : o.color}`} />
              {o.label}
            </button>
          );
        })}
        {enabled && (
          <button onClick={() => setEnabled(false)} className="h-8 px-2.5 rounded-md border border-white/10 text-[10px] uppercase tracking-widest text-white/40 hover:text-white">
            Mute
          </button>
        )}
      </div>

      {/* Visualization bars */}
      <div className="h-10 flex items-end gap-1">
        {enabled && Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="flex-1 bg-emerald-400/60 rounded-sm"
            style={{
              height: `${20 + Math.abs(Math.sin((i + 1) * 1.3 + Date.now())) * 60}%`,
              animation: `edubar ${0.6 + (i % 5) * 0.12}s ease-in-out ${i * 0.03}s infinite alternate`,
            }}
          />
        ))}
        {!enabled && <p className="text-[11px] text-white/30">Audio off — ambient tracks coming soon.</p>}
      </div>

      <style>{`@keyframes edubar { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }`}</style>
    </div>
  );
}