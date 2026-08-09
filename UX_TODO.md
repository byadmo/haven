# UX_TODO.md — Haven UI/UX Overhaul

## ✅ Phase 1: View Transitions API (COMPLETE)
- [x] CSS `::view-transition-*` rules + reduced-motion guard
- [x] `viewTransition` prop on all `Link`/`NavLink` across 8 layout files
- [x] `navigate(to, { viewTransition: true })` on all programmatic nav
- [x] `viewTransitionName: "haven-logo"` on shared logo in all 4 module layouts

## ✅ Phase 2: Overlay Spring Upgrade (COMPLETE)
- [x] `dialog.jsx` — Framer Motion `AnimatePresence` + spring scale (stiffness: 400, damping: 30)
- [x] `alert-dialog.jsx` — same spring pattern
- [x] `drawer.jsx` — spring slide-up entrance + blur overlay
- [x] `Reveal.jsx` — `useReducedMotion()` guard (instant render if reduced)
- [x] All 39 overlay consumers auto-upgraded via shared primitives

## ✅ Phase 3: Skeleton Loaders + Loading States (COMPLETE)
- [x] Created `skeleton-presets.jsx` — MetricCard, StatGrid, Chart, ListRow, CourseCard skeletons
- [x] Added `haven-fade-in` CSS class for skeleton→content swap
- [x] Wired `StatGridSkeleton` into `SIDashboard.jsx` with `loaded` state gate

## ✅ Phase 4: Staggered Reveals + Animated Counters (COMPLETE)
- [x] Created `useCountUp.jsx` — RAF-based count animation with reduced-motion guard
- [x] `CountUpText` convenience component
- [x] `EduCourses.jsx` — Framer Motion `staggerChildren: 0.08` with `useReducedMotion` guard

## ✅ Phase 5: Micro-Interaction Polish (COMPLETE)
- [x] **5a. Button transitions** — auto-fixed 12 components missing `transition-all duration-200 ease-out`
- [x] **5b. Button hover fix** — `button.jsx` outline/ghost variants: `hover:bg-accent` → `hover:bg-white/10`
- [x] **5c. Active states** — Button already has `active:scale-[0.97]`; toggle.jsx fixed in earlier phase
- [x] **5d. Focus-visible** — Button already has `focus-visible:ring-2`; comprehensive guard added

## ✅ Phase 6: Global Reduced-Motion Guard (COMPLETE)
- [x] Comprehensive `@media (prefers-reduced-motion: reduce)` block in `index.css`
- [x] Disables all animations, transitions, view transitions, and scroll behavior
- [x] `useReducedMotion()` hooks in `Reveal.jsx`, `dialog.jsx`, `alert-dialog.jsx`, `drawer.jsx`, `EduCourses.jsx`, `useCountUp.jsx`
