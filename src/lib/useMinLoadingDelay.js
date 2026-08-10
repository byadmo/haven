import { useEffect, useState } from "react";

/**
 * Returns `false` for `ms` milliseconds after the surrounding component mounts,
 * then `true`. Used by each Haven's layout to keep the entering loading splash
 * on screen long enough for its entrance animation to complete — so every
 * Haven loads in at the same deliberate pace instead of flashing away the
 * instant data resolves.
 *
 * The timer starts on mount (i.e. when the user enters the Haven), so it runs
 * concurrently with data loading; if data takes longer than `ms`, the splash
 * stays until data is ready (no extra wait).
 */
export function useMinLoadingDelay(ms = 1200) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return done;
}