import React from "react";
import { Type } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { getUiScale, setUiScale, UI_SCALE_MIN, UI_SCALE_MAX } from "@/lib/uiScale";

const PRESETS = [
  { label: "S", value: 0.9 },
  { label: "M", value: 1 },
  { label: "L", value: 1.05 },
  { label: "XL", value: 1.15 },
];

export default function UiSizeSetting() {
  const [scale, setScale] = React.useState(() => getUiScale());
  const pct = Math.round(scale * 100);

  function update(v) {
    setScale(v);
    setUiScale(v);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <div className="flex items-center gap-2 mb-1">
        <Type className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-semibold text-zinc-100">Display Size</h3>
      </div>
      <p className="text-xs text-white/40 mb-4">
        Adjust the size of text and elements throughout the app. Changes apply instantly and are saved for next time.
      </p>

      <div className="flex items-center gap-3">
        <span className="text-[10px] text-white/40 tabular-nums w-8">{Math.round(UI_SCALE_MIN * 100)}%</span>
        <Slider
          value={[scale]}
          min={UI_SCALE_MIN}
          max={UI_SCALE_MAX}
          step={0.01}
          onValueChange={([v]) => update(v)}
          className="flex-1"
        />
        <span className="text-[10px] text-white/40 tabular-nums w-9 text-right">{Math.round(UI_SCALE_MAX * 100)}%</span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-1.5">
          {PRESETS.map((p) => {
            const active = Math.abs(scale - p.value) < 0.005;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => update(p.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] border transition-colors ${
                  active
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 text-zinc-300 hover:border-white/30"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <span className="text-sm font-mono tabular-nums text-zinc-100">{pct}%</span>
      </div>
    </div>
  );
}