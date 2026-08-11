import React from "react";
import { Flame } from "lucide-react";
import HavenLoadingSplash from "@/components/shared/HavenLoadingSplash";

// Loading splash for Haven Growth, shown while the Growth module's data loads.
// Delegates to the shared HavenLoadingSplash so it shares the exact style and
// load-in speed of the Finance and Education entering splashes.
export default function GrowthLoadingSplash() {
  // Use stored theme or default to sunset (amber is Growth's brand accent)
  let themeKey = "sunset";
  try {
    const stored = localStorage.getItem("haven:theme:growth");
    if (stored) themeKey = stored;
  } catch {}
  const { THEMES } = require("@/lib/themes");
  return (
    <HavenLoadingSplash
      icon={Flame}
      accent="Growth"
      motto="Your growth. Unstoppable."
      palette={THEMES[themeKey] || THEMES.sunset}
    />
  );
}