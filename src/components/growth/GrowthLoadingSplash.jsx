import React from "react";
import { Flame } from "lucide-react";
import { THEMES } from "@/lib/themes";
import HavenLoadingSplash from "@/components/shared/HavenLoadingSplash";

// Loading splash for Haven Growth, shown while the Growth module's data loads.
// Delegates to the shared HavenLoadingSplash so it shares the exact style and
// load-in speed of the Finance and Education entering splashes.
export default function GrowthLoadingSplash() {
  return (
    <HavenLoadingSplash
      icon={Flame}
      accent="Growth"
      motto="Your growth. Unstoppable."
      palette={THEMES.sunset}
    />
  );
}