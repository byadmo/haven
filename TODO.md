# Haven App Optimization & Enhancement Backlog

## ✅ Previously Completed
- [x] Insights: Removed 50-year Snowball/Avalanche comparison
- [x] Growth: Splash screen, setup wizard, settings page, entity schema
- [x] Global: Theme + UI scale sync across all modules
- [x] AI: Formatting rules (bullets + emojis) across all agent prompts

---

## 🟢 1. Haven Financial

### 1a. Replace "Upcoming Bills" with "Upcoming & Recurring" box
**Files:** `src/pages/Dashboard.jsx`, `src/components/finance/UpcomingBills.jsx`, `src/components/finance/UpcomingRecurring.jsx`

**Steps:**
1. In `Dashboard.jsx`, replace the `<UpcomingBills>` import and usage with `<UpcomingRecurring>`.
2. Pass the same props (`transactions`, `accounts`, `onChanged`/`refresh`) that `UpcomingBills` currently receives.
3. Remove the `UpcomingBills` import line.
4. `UpcomingRecurring` already exists and is more capable (combines auto-detected recurring + one-time upcoming). No new component needed.
5. Verify the Dashboard renders the new box in the same grid slot.

### 1b. Fix Budget Breakdown hover state glitch
**Root cause:** `src/components/ui/toggle.jsx` — the `toggleVariants` base class uses `hover:bg-muted hover:text-muted-foreground`. On the dark theme, `--muted` resolves to a light/white color, causing the white-on-hover flash on the Bar/Pie toggle buttons in `BudgetChart.jsx`.

**Steps:**
1. In `toggle.jsx`, change the base `hover:bg-muted hover:text-muted-foreground` to `hover:bg-white/10 hover:text-white` so it respects the dark canvas.
2. In the `outline` variant, change `hover:bg-accent hover:text-accent-foreground` to `hover:bg-white/10 hover:text-white`.
3. Verify the toggle buttons in `BudgetChart.jsx` no longer flash white on hover.

### 1c. Remove "Transactions" and "Accounts" from primary navbar
**File:** `src/lib/navConfig.js`

**Steps:**
1. Remove the `accounts` entry (line 26: `{ id: "accounts", to: "/accounts", ... }`) from `FINANCE_PAGES`.
2. Remove the `transactions` entry (line 27: `{ id: "transactions", to: "/transactions", ... }`) from `FINANCE_PAGES`.
3. Remove `"transactions"` and `"accounts"` from `FINANCE_DEFAULT_NAV` if present.
4. The pages remain accessible via direct URL — only the nav buttons are removed.
5. Verify nav bar renders without Transactions/Accounts buttons.

---

## 📘 2. Haven Education

### 2a. Responsive layout refactor — spacing, alignment, grid/flexbox
**Files:** `src/lib/eduSyncContext.jsx` (EduLayout), all `src/pages/edu/*.jsx`, key `src/components/edu/*.jsx`

**Steps:**
1. **EduLayout** (`eduSyncContext.jsx`): Audit the wrapper div spacing — ensure `px-4 sm:px-6 lg:px-8` responsive padding, `py-6 sm:py-8` vertical rhythm, and `pb-24 sm:pb-8` bottom padding for mobile nav clearance.
2. **EduDashboard.jsx**: Ensure stat cards grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with consistent `gap-4 sm:gap-6`.
3. **EduCourses.jsx**: Ensure course cards grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` with proper `gap-3 sm:gap-4`.
4. **EduSchedule.jsx**: Ensure schedule items use responsive flex with `flex-col sm:flex-row` where needed, proper `gap-3` spacing.
5. **EduGrades.jsx**: Ensure grade cards and GPA projections use `grid-cols-1 sm:grid-cols-2` with consistent gaps.
6. **EduAnalytics.jsx**: Ensure chart containers use `h-[250px] sm:h-[300px]` responsive heights and full-width on mobile.
7. **EduTimer.jsx**: Ensure timer display is centered with responsive font sizes (`text-4xl sm:text-6xl`).
8. **EduSettings.jsx**: Ensure settings sections use `space-y-4 sm:space-y-6` and inputs are full-width on mobile.
9. **Component-level**: Audit `EduTopBar`, `EduBottomNav`, `CourseCard`, `FocusRow`, `GradeCalculator` for mobile padding and text truncation.
10. Verify all breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px).

---

## 🚀 3. Haven Growth

### 3a. Splash screen theme sync
**Files:** `src/components/growth/GrowthSplash.jsx`, `src/lib/SILayout.jsx`

**Current state:** GrowthSplash uses hardcoded amber/orange gradient. Needs to dynamically match the user's selected Growth theme.

**Steps:**
1. In `GrowthSplash.jsx`, read the current theme via `getStoredTheme("growth")` or accept a `theme` prop from `SILayout`.
2. Replace the hardcoded `background: "radial-gradient(... amber ...)"` with values derived from `THEMES[themeKey]` — use `t.bg`, `t.surface`, `t.primary` for the gradient stops.
3. Replace the hardcoded `text-amber-400` classes with inline styles using `t.primary`.
4. Pass the theme from `SILayout` (which already has `settings.theme`) to `GrowthSplash` as a prop.
5. Verify splash screen matches the selected theme (midnight = indigo, forest = green, sunset = orange, etc.).

### 3b. Verify all module splash screens use theme colors
**Files:** `src/pages/Splash.jsx` (auth splash), `src/components/edu/EduSplash.jsx` (education)

**Steps:**
1. Check if `EduSplash.jsx` exists and uses theme colors. If it uses hardcoded emerald, update it to read from `getStoredTheme("education")`.
2. The auth `Splash.jsx` intentionally uses the "original" true-black theme — leave as-is per existing design decision.
3. Ensure `GrowthSplash` is consistent with the pattern used by `EduSplash`.

---

## ⚙️ 4. Execution Order

| Step | Task | Files | Risk |
|------|------|-------|------|
| 1 | Fix toggle hover bug | `toggle.jsx` | Low — CSS class change |
| 2 | Remove Transactions/Accounts from nav | `navConfig.js` | Low — array edit |
| 3 | Replace UpcomingBills with UpcomingRecurring | `Dashboard.jsx` | Low — import swap |
| 4 | Growth splash theme sync | `GrowthSplash.jsx`, `SILayout.jsx` | Low — style injection |
| 5 | Education responsive refactor | `eduSyncContext.jsx`, `pages/edu/*.jsx` | Medium — many files, visual |
| 6 | Lint + build verification | — | — |
