import React from "react";
import { useLocation, useOutlet } from "react-router-dom";

// Keep-alive outlet: instead of unmounting a page when the user navigates
// away, keep up to MAX_MOUNTED recently-visited pages mounted in the DOM and
// toggle their visibility with CSS (display:none — which also blocks
// interaction on hidden instances). Returning to a visited page is instant —
// no re-fetch, no re-render, no loading spinner — and scroll/state is
// preserved. An LRU cap bounds memory on low-end devices; the oldest page is
// unmounted when the limit is exceeded. A 150ms fade (dd-page-enter) makes the
// switch feel like a native tab transition rather than a page load.
const MAX_MOUNTED = 4;

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
    <div className="keep-alive-root">
      {[...cache.current.entries()].map(([path, entry]) => {
        const active = path === location.pathname;
        return (
          <div
            key={path}
            className={active ? "dd-page-enter" : ""}
            style={{ display: active ? "block" : "none" }}
            aria-hidden={!active}
          >
            {entry.el}
          </div>
        );
      })}
    </div>
  );
}