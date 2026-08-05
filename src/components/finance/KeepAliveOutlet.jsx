import React from "react";
import { useLocation, useOutlet } from "react-router-dom";
import PageErrorBoundary from "@/components/finance/PageErrorBoundary";

// Keep-alive outlet: instead of unmounting a page when the user navigates
// away, keep up to MAX_MOUNTED recently-visited pages mounted in the DOM and
// cross-fade between them with CSS opacity transitions (GPU-friendly — no
// layout/transform animation). The active page is in normal flow (defines the
// container height); inactive pages are absolutely layered behind it with
// pointer-events disabled, so taps never bleed through. Returning to a
// visited page is instant — no re-fetch, no re-render — and scroll/state is
// preserved. An LRU cap bounds memory on low-end devices.
//
// Fade timing: incoming 200ms ease-out, outgoing 150ms ease-out. They run
// simultaneously (the outgoing sits behind, z-index 0; the incoming is on top,
// z-index 10) so there is never a flash of empty background.
const MAX_MOUNTED = 4;

const ACTIVE_STYLE = {
  position: "relative",
  zIndex: 10,
  opacity: 1,
  pointerEvents: "auto",
  overflow: "visible",
  transition: "opacity 200ms ease-out",
};
const INACTIVE_STYLE = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 0,
  opacity: 0,
  pointerEvents: "none",
  overflow: "hidden",
  transition: "opacity 150ms ease-out",
};

export default function KeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const cache = React.useRef(new Map());

  if (outlet) {
    cache.current.set(location.pathname, { el: outlet, ts: Date.now() });
    // LRU eviction — never evict the route the user is currently viewing.
    if (cache.current.size > MAX_MOUNTED) {
      const sorted = [...cache.current.entries()].sort((a, b) => a[1].ts - b[1].ts);
      while (cache.current.size > MAX_MOUNTED && sorted.length) {
        const [oldestPath] = sorted.shift();
        if (oldestPath === location.pathname) continue;
        cache.current.delete(oldestPath);
      }
    }
  }

  return (
    <div className="keep-alive-root relative">
      {[...cache.current.entries()].map(([path, entry]) => {
        const active = path === location.pathname;
        return (
          <div
            key={path}
            style={active ? ACTIVE_STYLE : INACTIVE_STYLE}
            aria-hidden={!active}
          >
            <PageErrorBoundary>{entry.el}</PageErrorBoundary>
          </div>
        );
      })}
    </div>
  );
}