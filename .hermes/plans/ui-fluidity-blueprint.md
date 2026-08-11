# Haven UI Fluidity Blueprint — Build Plan

## 1. Physical Space Effect (layoutId — Bento→Modal)

**Goal:** When user clicks a habit card, stat card, or dashboard tile, it physically expands into the full detail view instead of disappearing while a modal pops up.

**How to add to existing code without breaking anything:**

### Pattern for layoutId shared components:
```jsx
// The thumbnail (e.g. in a grid)
<motion.div layoutId={`stat-${id}`} className="...">
  <Icon /><p>{value}</p><p>{label}</p>
</motion.div>

// The expanded view (full-width detail card or modal content)
<motion.div layoutId={`stat-${id}`} className="...">
  <Icon /><p>{value}</p><p>{label}</p>
  {/* extra detail content */}
</motion.div>
```

### Implementation targets:
- **SIDashboard stats grid** (4 stat cards) → clicking a stat expands it into a detailed breakdown
- **HabitsPage** habit rows → clicking edit expands the row into the edit dialog (currently a separate dialog, use layoutId to make it feel like the row itself grows)
- **StreaksPage** leaderboard → clicking a streak row expands into detail view
- **FinancialDashboard** stat cards → same pattern

### MVP approach (minimal, highest impact):
1. Wrap all stat cards on SIDashboard in `<motion.div layoutId={...}>`
2. Create an expandable detail view that replaces the card when clicked
3. Same for FinancialDashboard stat cards
4. Same for HabitsPage rows → edit dialog

## 2. Staggered Cascades (staggerChildren)

**Goal:** Cards cascade in sequentially rather than appearing all at once.

### Current pattern (no stagger — all appear at once):
```jsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
  {items.map(item => <div key={id} className="...">...</div>)}
</div>
```

### Target pattern:
```jsx
<motion.div
  variants={{ show: { transition: { staggerChildren: 0.05 } } }}
  initial="hidden"
  animate="show"
  className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
>
  {items.map(item => (
    <motion.div
      key={id}
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      className="..."
    >
      ...
    </motion.div>
  ))}
</motion.div>
```

### Implementation targets (all grid/flex layouts):
| Page | Container | Cards |
|---|---|---|
| **SIDashboard** | 4 stat cards grid | `staggerChildren: 0.05` |
| **SIDashboard** | Today's habits list | `staggerChildren: 0.03` |
| **SIDashboard** | Weekly summary grid | `staggerChildren: 0.04` |
| **SIDashboard** | Quick links grid | `staggerChildren: 0.04` |
| **FinancialDashboard** | Stat cards grid | `staggerChildren: 0.05` |
| **HabitsPage** | Habit rows | `staggerChildren: 0.03` |
| **StreaksPage** | Leaderboard rows | `staggerChildren: 0.04` |
| **StreaksPage** | Monthly comparison cards | `staggerChildren: 0.05` |
| **JournalPage** | Entry cards | `staggerChildren: 0.04` |

### Edge cases:
- **Reduced motion**: Wrap with `useReducedMotion()` — when true, render as normal `<div>` without motion wrappers
- **Filter/sort changes**: Use `AnimatePresence` with `key` prop on the container to re-trigger cascade when items change
- **Loading state**: Only cascade on the `haven-fade-in` transition (already skeleton → content)

## 3. Tactile hover:scale-105

**Goal:** Every interactive element provides physical feedback on hover — expand slightly, compress on press.

### Current state:
- Buttons: have `active:scale-[0.97]` but no `hover:scale-105`
- Checkbox, switch, tabs: same
- Cards, rows, list items: no scale effects at all

### Target classes to add:
```jsx
// For buttons and interactive controls:
className="... hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"

// For cards and list items:
className="... hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 ease-out"

// For stat cards and metric displays:
className="... hover:scale-[1.02] transition-transform duration-200 ease-out"
```

### Implementation approach:
Rather than editing every component individually, add the classes to the **shared component primitives** (button.jsx, card.jsx, stat card pattern). Then add to the most impactful page-level interactive elements.

### Priority targets:
1. `src/components/ui/button.jsx` — add `hover:scale-105 active:scale-95` to the `buttonVariants` base class
2. `src/components/ui/checkbox.jsx` — add `hover:scale-105 active:scale-95`
3. `src/components/ui/switch.jsx` — add `hover:scale-105 active:scale-95`
4. All stat cards across all pages — add `hover:scale-[1.02]`
5. All habit rows, streak rows, journal entries — add `hover:scale-[1.01] active:scale-[0.99]`
6. Quick link cards on dashboard — add `hover:scale-[1.02] active:scale-[0.98]`

## 4. Performance (will-change-transform)

**Goal:** Pre-allocate GPU memory for elements that animate, preventing jitter.

### Current state:
- Only `.dd-page-enter` has `will-change: opacity`

### Targets to add `will-change-transform`:
1. **Drawer** (slide-up panel) — the slide-up container
2. **Dialog** (modal backdrop + content) — the content panel
3. **Mobile bottom nav** — the pill that slides/animates
4. **Animated counters** — elements using `useCountUp`
5. **Confetti/particles** — the floating particles in SIDashboard
6. **ProcessingAnimation rings** — the concentric spinning rings
7. **Bento cards with layoutId** — elements that animate between positions

## Execution Order

1. **button.jsx** — add hover:scale-105 + active:scale-95 to the base variant classes (highest impact, single file, affects all buttons)
2. **checkbox.jsx, switch.jsx, tabs.jsx** — same scale classes
3. **SIDashboard** — staggered cascades on stat grid, habits list, weekly summary, quick links
4. **SIDashboard** — layoutId on stat cards + expand-to-detail
5. **FinancialDashboard** — staggered cascades on stat cards
6. **HabitsPage** — staggered cascades + hover scale on rows
7. **StreaksPage** — staggered cascades + hover scale
8. **JournalPage** — staggered cascades + hover scale
9. **Drawer + Dialog** — will-change-transform
10. **Build + verify + push**

## Files to Modify (no new files)

| File | Changes |
|------|---------|
| `src/components/ui/button.jsx` | hover:scale-105 + active:scale-95 in variants |
| `src/components/ui/checkbox.jsx` | hover:scale-105 + active:scale-95 |
| `src/components/ui/switch.jsx` | hover:scale-105 + active:scale-95 |
| `src/components/ui/tabs.jsx` | hover:scale-105 + active:scale-95 |
| `src/pages/growth/SIDashboard.jsx` | Staggered cascades on 4 grids, layoutId on stat cards |
| `src/pages/growth/HabitsPage.jsx` | Stagger on rows, hover scale |
| `src/pages/growth/StreaksPage.jsx` | Stagger on rows + comparison, hover scale |
| `src/pages/growth/JournalPage.jsx` | Stagger on entries, hover scale |
| `src/pages/finance/FinancialDashboard.jsx` | Stagger on stat cards |
| `src/components/ui/drawer.jsx` | will-change-transform |
| `src/components/ui/dialog.jsx` | will-change-transform |
| `src/index.css` | Add will-change to animated elements |