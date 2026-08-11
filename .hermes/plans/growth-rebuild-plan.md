# Haven Growth — Integration Rebuild (Corrected)

## Framework: Each module has a fixed brand accent (Finance=emerald, Education=emerald, Growth=amber). The theme system changes canvas colors (bg, surface, text, border) but not the module accent. All amber stays as-is.

---

## Issues & Fixes (validated)

### 🐛 Bug Fixes

**1. Habit Strength Score is broken**
- Root cause: `toggleHabit` in SIContext never updates `cumulative_repetitions` or `misses` on habits — the `useHabitScore.ts` formula needs these fields but they stay at 0
- Fix: Modify `toggleHabit` to increment `cumulative_repetitions` when toggling ON, and calculate `misses` from the gaps in entries. Also update the habit object in state
- Impact: All habit score bars show 0%

**2. GrowthContext XP calc is fragile**
- Root cause: Uses `Math.max(prev, newXp)` — recalculates XP fresh from all entries on every render, but the calculation has a bug where it only counts check-ins for habits with score > 0.5
- Fix: Replace with simple deterministic calc: each check-in = `floor(10 * difficulty)` XP. Add 5 XP streak milestone bonuses at 7/14/30/60/90 days
- Impact: XP can fluctuate or get stuck

### 🔧 Missing Features

**3. No edit habit**
- Current: Only delete + recreate (loses streak data)
- Fix: Add `editHabit(id, updates)` to SIContext, wire into HabitsPage
- Impact: UX friction, data loss

**4. Identity goal disappears after setup**
- Current: Onboarding collects identity phrase, stores it, but never shows it again
- Fix: Show identity banner on dashboard + display in settings profile section
- Impact: Lost emotional connection

**5. Focus/Pomodoro stats hidden**
- Current: Only visible inside the Pomodoro dialog
- Fix: Add "Today's Focus" widget to dashboard showing sessions, minutes, linked habits
- Impact: Feature isolation

### 🧹 Cleanup

**6. Deep Analytics duplicates Analytics**
- Root cause: Same content, different wrapper
- Fix: Remove `deep-analytics` from `SI_DEFAULT_NAV`. Keep route accessible via direct URL
- Impact: Redundant nav item

**7. SILayout uses `window.location` instead of `useLocation()`**
- Root cause: Won't re-render active nav state on route change
- Fix: Import and use `useLocation()` from react-router-dom
- Impact: Stale nav state

**8. Loading/splash components hardcode sunset theme**
- Root cause: GrowthLoadingSplash, IdentitySetupFlow pass "sunset" instead of `settings.theme`
- Fix: Read from SI settings context, pass actual theme
- Impact: Visual mismatch when user switches theme (affects bg/surface gradient only, not amber accent)

---

## Execution

### Step 1: SIContext.jsx — track reps/misses + editHabit

**toggleHabit changes:**
```
When toggling ON (adding entry):
  - Find the habit, increment cumulative_repetitions by 1
  - Recalculate misses: count days since habit creation with no entry
  
When toggling OFF (removing entry):
  - Decrement cumulative_repetitions by 1
```

**editHabit(id, updates):**
```
- Accepts: name, icon, color, difficulty, frequency
- Patch existing habit in state (or recreate via backend)
- Same pattern as addHabit but with existing id
```

### Step 2: GrowthContext.tsx — deterministic XP

```
New XP logic per check-in:
  base = 10 * habit.difficulty
  If habit has a streak >= 7: bonus = 5
  If habit has a streak >= 14: bonus = 5 (cumulative)
  etc.
  Total XP = sum of all check-in XP + streak bonuses

Calculated fresh in useMemo from entries, not stored in localStorage
(this means it's always accurate, even after deleting habits)
```

### Step 3: SILayout.jsx — useLocation + nav cleanup

```
- Remove "deep-analytics" from SI_DEFAULT_NAV
- Change window.location → useLocation()
```

### Step 4: SIDashboard.jsx — identity banner + focus widget

```
Identity banner (between XP bar and stats):
  "Becoming: [identity phrase]" with identity icon
  Only shows if identity_goal or primary_focus_goal is set
  Uses amber accent, subtle glassmorphism

Focus widget (below today's habits):
  Today's focus sessions count
  Total minutes focused today
  Link to Pomodoro
  Uses amber accent
```

### Step 5: HabitsPage.jsx — edit habit mode

```
Click on habit name/row (not the toggle) opens edit dialog:
  - Same UI as create dialog but pre-filled
  - Fields: name, icon, color, difficulty, schedule
  - Save button calls editHabit(id, updates)
```

### Step 6: GrowthSettingsPage.jsx — show identity goal

```
In Profile section:
  Show stored identity_goal as read-only
  Show primary_focus_goal in a secondary field
```

### Step 7: GrowthLoadingSplash + IdentitySetupFlow — use user theme

```
GrowthLoadingSplash: read settings.theme, pass to palette prop
IdentitySetupFlow: read settings.theme from useSI(), use instead of "sunset"
```

### Step 8: Build + verify + push

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/lib/SIContext.jsx` | editHabit, track reps/misses in toggleHabit |
| `src/lib/GrowthContext.tsx` | Deterministic XP calc with streak bonuses |
| `src/lib/SILayout.jsx` | useLocation(), remove deep-analytics from defaults |
| `src/pages/growth/SIDashboard.jsx` | Identity banner, focus widget |
| `src/pages/growth/HabitsPage.jsx` | Edit habit dialog |
| `src/pages/growth/GrowthSettingsPage.jsx` | Show identity goal |
| `src/components/growth/GrowthLoadingSplash.jsx` | Use user theme |
| `src/components/growth/IdentitySetupFlow.jsx` | Use user theme |

No new files needed. All changes are modifications to existing files.