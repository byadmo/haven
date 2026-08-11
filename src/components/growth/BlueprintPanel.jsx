import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, ChevronDown, RefreshCw, Plus, Target, ArrowRight,
  Brain, BookOpen, Heart, Users, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { THEMES } from "@/lib/themes";
import { generateBlueprint } from "@/hooks/useIdentityBlueprint";

const ICON_MAP = {
  Brain, Target, BookOpen, Heart, Users, DollarSign,
  Dumbbell: Target,
  Droplets: Target,
  Moon: Target,
};

export default function BlueprintPanel({ theme, blueprint, onFinalize, onRegenerate }) {
  const t = THEMES[theme] || THEMES.sunset;
  const [items, setItems] = useState(
    blueprint.items.map((item) => ({ ...item }))
  );
  const [regenerating, setRegenerating] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  const handleToggleInclude = (id) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, included: !i.included } : i))
    );
  };

  const handleSizeChange = (id, newSize) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const sizeData = i.availableSizes.find((s) => s.id === newSize);
        return {
          ...i,
          habitSize: newSize,
          name: sizeData?.name || i.name,
        };
      })
    );
  };

  const handleAnchorChange = (id, anchor) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, anchor } : i))
    );
  };

  const handleNameChange = (id, name) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, name } : i))
    );
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const newItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      baseName: customName.trim(),
      icon: "Target",
      color: "amber",
      category: blueprint.categoryId || "focus",
      habitSize: "small",
      availableSizes: [
        { id: "tiny", label: "Tiny", name: customName.trim() },
        { id: "small", label: "Small", name: customName.trim() },
        { id: "moderate", label: "Moderate", name: customName.trim() },
        { id: "full", label: "Full", name: customName.trim() },
      ],
      difficulty: 2,
      anchor: "starting my day",
      availableAnchors: [
        "waking up",
        "starting my day",
        "finishing my coffee",
        "getting into bed",
      ],
      frequency: "daily",
      rationale: "A custom habit you chose — own it.",
      included: true,
    };
    setItems((prev) => [...prev, newItem]);
    setCustomName("");
    setShowAddCustom(false);
  };

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => {
      const newBlueprint = generateBlueprint({
        identityText: blueprint.identityPhrase,
        frictionText: blueprint.friction?.text || "",
        commitment: items.length <= 1 ? "gentle" : items.length <= 3 ? "balanced" : "full",
      });
      setItems(newBlueprint.items.map((item) => ({ ...item })));
      setRegenerating(false);
    }, 600);
  };

  const includedItems = items.filter((i) => i.included);
  const IconComp = items.length > 0
    ? ICON_MAP[items[0].icon] || Target
    : Target;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex flex-col text-white select-none"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${t.surface} 0%, ${t.bg} 50%, #000000 100%)`,
      }}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{blueprint.identityIcon}</span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Your Identity Blueprint</h2>
            <p className="text-xs" style={{ color: t.muted }}>
              For someone who is <span className="text-white/70">{blueprint.identityPhrase}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable habit list */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
        <AnimatePresence>
          {items.map((item) => {
            const ItemIcon = ICON_MAP[item.icon] || Target;
            const sizeLabel =
              item.availableSizes.find((s) => s.id === item.habitSize)?.label ||
              "Small";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-2xl border transition-all ${
                  item.included
                    ? "border-white/15 bg-black/60"
                    : "border-white/5 bg-black/30 opacity-50"
                }`}
              >
                {/* Card header */}
                <div className="p-4 space-y-3">
                  {/* Row 1: Toggle + Icon + Name + Size */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleInclude(item.id)}
                      className={`grid place-items-center rounded-lg border h-9 w-9 shrink-0 transition-all ${
                        item.included
                          ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                          : "border-white/15 bg-white/5 text-white/20"
                      }`}
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <input
                        value={item.name}
                        onChange={(e) => handleNameChange(item.id, e.target.value)}
                        className="text-sm font-medium bg-transparent border-none outline-none text-white w-full focus:ring-0 p-0"
                      />
                    </div>

                    {/* Size badge (clickable) */}
                    <div className="relative group">
                      <button
                        onClick={() => {
                          const sizes = item.availableSizes;
                          const idx = sizes.findIndex((s) => s.id === item.habitSize);
                          const next = sizes[(idx + 1) % sizes.length];
                          handleSizeChange(item.id, next.id);
                        }}
                        className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/50 hover:text-white/80 hover:border-white/20 transition-all"
                      >
                        {sizeLabel} <ChevronDown className="h-3 w-3" />
                      </button>
                      {/* Size tooltip */}
                      <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-white/10 rounded-lg p-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-44">
                        <p className="text-[9px] text-white/40 mb-1.5 uppercase tracking-wider">Size</p>
                        {item.availableSizes.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSizeChange(item.id, s.id)}
                            className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors ${
                              item.habitSize === s.id
                                ? "text-amber-300 bg-amber-500/10"
                                : "text-white/50 hover:text-white"
                            }`}
                          >
                            {s.label}: {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rationale */}
                  <p className="text-[10px] leading-relaxed pl-12" style={{ color: t.muted }}>
                    <span className="text-white/30">Why this? →</span> {item.rationale}
                  </p>

                  {/* Row 2: Anchor selector */}
                  <div className="pl-12">
                    <label className="text-[9px] uppercase tracking-wider text-white/30 block mb-1.5">
                      I'll do this right after...
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.availableAnchors.slice(0, 4).map((anchor) => (
                        <button
                          key={anchor}
                          onClick={() => handleAnchorChange(item.id, anchor)}
                          className={`rounded-full border px-2.5 py-1 text-[10px] transition-all ${
                            item.anchor === anchor
                              ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                              : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                          }`}
                        >
                          {anchor}
                        </button>
                      ))}
                      {/* Custom anchor */}
                      <input
                        placeholder="+ custom..."
                        value={item.anchor && !item.availableAnchors.includes(item.anchor) ? item.anchor : ""}
                        onChange={(e) => handleAnchorChange(item.id, e.target.value)}
                        className="w-24 bg-transparent border-none text-[10px] text-white/30 placeholder:text-white/20 outline-none focus:text-white/70 p-0"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add custom habit */}
        {showAddCustom ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-4">
            <div className="flex items-center gap-2">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter your custom habit..."
                className="bg-black border-white/10 text-white text-sm h-10"
                autoFocus
              />
              <Button
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className="bg-amber-500/20 border border-amber-400/30 text-amber-300 hover:bg-amber-500/30 h-10"
                variant="outline"
              >
                Add
              </Button>
              <Button
                onClick={() => setShowAddCustom(false)}
                variant="ghost"
                className="text-white/40 h-10"
              >
                ✕
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-transparent py-3 text-xs text-white/30 hover:text-white/60 hover:border-white/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Add another habit
          </button>
        )}

        {/* Rationale summary */}
        {includedItems.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 mt-2">
            <p className="text-[10px] text-white/40 leading-relaxed">
              <span className="text-amber-300/70">Your stack:</span>{" "}
              {includedItems.length} micro-habit{includedItems.length > 1 ? "s" : ""} × "
              {includedItems.map((i) => i.name).join(", ")}
              " — anchored to your daily cues.
            </p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="px-6 pb-6 pt-2 space-y-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRegenerate}
            variant="outline"
            className="flex-1 border-white/10 text-white/50 hover:text-white hover:border-white/20 text-xs h-11 rounded-xl"
            disabled={regenerating}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Generating..." : "Regenerate"}
          </Button>
          <Button
            onClick={() => onFinalize(items.filter((i) => i.included))}
            disabled={includedItems.length === 0}
            className="flex-[2] h-11 text-sm font-semibold rounded-xl disabled:opacity-30 transition-all"
            style={{ background: t.primary, color: "#000" }}
          >
            Finalize Plan <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}