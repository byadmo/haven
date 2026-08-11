# Growth Identity-First Setup Redesign

## Goal: Replace the current 6-step wizard with a modern, AI-driven identity-based onboarding that feels like a conversation, not a form.

---

## Phase 1: The Hook — Value Preview (0:00–0:15)

**Current problem:** The splash screen says "Welcome to Haven Growth" with 3 generic feature cards. No emotional hook, no future-self visualization.

**Expanded design:**

1. **Full-screen overlay** (replaces GrowthSplash.jsx) — dark gradient backdrop with subtle animated particles
2. **Core value proposition** — instead of listing features, show a visual preview: a mock dashboard card that animates in showing "You: Level 12 · 47-day streak · 89% consistency"
3. **The tagline:** "Become the person who **never misses twice**."
4. **Sub-text:** "Most people try to change everything at once. We start with one identity shift."
5. **Single CTA:** "Begin Your Transformation →" button with a spring entrance animation
6. **Understated skip link:** "I already have a routine →" (small, bottom-right, for returning users)

**Visual spec:**
- Background: `radial-gradient(ellipse at 50% 0%, tinted surface → dark bg → black)`
- Future-self card: glassmorphism panel with animated XP counter (0 → 12), streak counter, consistency score
- Button: primary accent (amber), rounded-xl, 48px h, full-width on mobile
- Minimal — no feature cards, no icons taking space. Just the future-self vision.

---

## Phase 2: Identity Intake — "Who Do You Want to Become?" (0:15–0:30)

**Current problem:** Step 1 asks for a name (pointless), Step 2 asks "What area to focus on?" (task-oriented, not identity-oriented). There's no emotional weight.

**Expanded design:**

### Step 1 — Identity Statement (single-question screen)
- **Prompt:** "Who do you want to become?"
- **Input:** A single-line text input with placeholder examples:
  - "I am someone who *protects their attention*"
  - "I am someone who *wakes up early with purpose*"
  - "I am someone who *invests in my body daily*"
  - "I am someone who *reads 20 pages every day*"
- The placeholder examples cycle every 3 seconds via a gentle crossfade
- Below: "Or pick a starting identity" → 6 identity chips (not focus areas):
  - "The Focused Creator" 🧠
  - "The Disciplined Athlete" 💪
  - "The Lifelong Learner" 📖
  - "The Calm Mind" 🧘
  - "The Financial Guardian" 🛡️
  - "The Connected Human" 🤝
- Selecting a chip auto-fills the input with a starter identity phrase
- **Progressive disclosure:** only this question visible + a "Next" button

### Step 2 — Friction Discovery (appears after identity is stated)
- **Prompt:** "What's getting in the way of becoming that person?"
- **Input:** A multi-line textarea with gentle prompt: "Describe the friction — be honest. No judgment."
- **Examples below the box** (chips that auto-fill on click):
  - "I scroll social media for 2 hours before bed"
  - "I can't find the energy after work"
  - "I forget to check in by midday"
  - "I start strong but quit by day 5"
  - "I don't know where to begin"
- No "required" label — the user can skip this with just an identity

### Step 3 — Commitment Pace (appears after friction)
- **Prompt:** "What pace feels right for *this version of you*?"
- Three options (rich cards, not radio buttons):
  - 🌱 **Gentle Start** — 1 micro-habit. "Identity is built in inches."
  - 🔥 **Balanced Growth** — 2-3 habits. "Steady momentum compounds."
  - ⚡ **Full Commitment** — 4 habits. "You're ready to transform."
- Each shows a visual comparison: "1 habit × 30 days = identity reinforced"
- Selected card pulses once with accent color

**Transition mechanic:** Each step slides in from the right (previous slides left) with a spring animation. A thin progress bar at the top shows 3/5 complete.

---

## Phase 3: The Processing State — "Crafting Your Blueprint" (0:30–0:35)

**Current problem:** No processing state at all — habits are created silently behind a "Saving..." button.

**Expanded design:**

1. **Full-screen overlay** with animated gradient background (subtle color shift amber → teal)
2. **Central animation:** Three concentric rings pulsing at different speeds (outer: 4s, middle: 2.5s, inner: 1.5s rotation + scale)
3. **Text progression** — three messages that fade in 1s apart:
   - Line 1: "Analyzing your identity..." (0.0s)
   - Line 2: "Designing your micro-habits..." (1.0s)
   - Line 3: "Choosing your anchors..." (2.0s)
4. **At 3.5s:** The rings converge, text changes to "Your blueprint is ready ✨" with a subtle sparkle
5. **Auto-advance** to Phase 4 at 4s

**The "AI" backend logic (pure frontend):**
The system maps identity keywords → habit templates:
- "focused", "attention", "deep work", "flow" → Focus & Productivity stack
- "athlete", "fitness", "strong", "body" → Fitness stack
- "learner", "reading", "study", "knowledge" → Learning stack  
- "calm", "mindful", "peace", "meditate" → Mindfulness stack
- "money", "finance", "wealth", "save" → Finance stack
- "connect", "relationship", "social", "friend" → Social stack

The friction text is parsed for keywords that adjust difficulty and select micro-habit scaling:
- "scrolling", "phone", "distracted", "procrastinate" → habit anchoring targets (laptop, phone)
- "energy", "tired", "exhausted" → habit sized down (1 pushup, 1 page)
- "forget" → reminder anchors + smaller habit

---

## Phase 4: Plan Refinement — "Your Identity Blueprint" (0:35–0:50)

**Current problem:** A flat list of habit checkboxes with no micro-sizing, no anchoring, no ownership feeling.

**Expanded design:**

### The Blueprint Display
Each AI-generated micro-habit is displayed as a card with three editable fields:

**Card 1: "The ritual" (behavior)**
- Pre-filled micro-sized suggestion: e.g. "Read 1 page" (not "Read 20 pages")
- Editable — user can type to adjust: "Read 5 pages", "Read for 10 minutes"
- Visual slider: Tiny (1m) → Small (5m) → Moderate (15m) → Full (30m) — with the AI-recommended size pre-selected
- Rationale text below: "Why this size? → Because you said 'I start strong but quit by day 5.' Starting smaller makes streaks unbreakable."

**Card 2: "The anchor" (trigger)**
- Dropdown or chip selector: "I'll do this **right after**..."
  - "...brushing my teeth in the morning"
  - "...opening my laptop"
  - "...finishing my first coffee"
  - "...getting into bed"
  - "...coming home from work"
  - "...finishing lunch"
  - Custom anchor (type your own)
- The AI pre-selects the anchor based on friction keywords

**Card 3: "The frequency"**
- Simple toggle: Daily / Weekdays / Weekends / Custom
- Pre-set to "Daily" for most habits, "Weekdays" for work-related ones

**Card header:**
- Color dot (auto-assigned from identity palette)
- Habit name (editable inline)
- Checkbox: included in plan (default checked)
- Drag handle for reordering (optional nice-to-have)

**Bottom bar:**
- "Regenerate" link: shuffles to a different habit combination
- "Add another" link: opens a mini habit creator
- "Finalize Plan →" CTA button

**Psychology:**
- The "micro-habit" framing lowers resistance
- The anchor selector creates an implementation intention (if-then plan)
- Editable fields give ownership — the user feels they designed the plan, not the AI

---

## Phase 5: Dashboard Handoff — The First Win (0:50–1:00)

**Current problem:** The setup dialog closes, the dashboard appears with zero guidance. User has to figure out what to do.

**Expanded design:**

### Transition Animation (0:50–0:53)
1. The blueprint dialog fades out with a scale-down
2. Dashboard slides in from below with a spring
3. The user's new habits are already toggled as "today" with their color dots visible
4. A small "Your first day!" banner animates in at the top: "Day 1 of becoming someone who..."
5. XP animation: +50 XP bonus for completing setup, shown as a floating counter

### Contextual Tooltips (0:53–1:00)
Two tooltips, sequential, that guide WITHOUT a tutorial:

**Tooltip 1 — "The Toggle" (appears on first habit)**
- Points at the first habit's checkbox
- Text: "Tap the checkmark to complete this habit. **That's it.** One action, one identity reinforcement."
- "Got it →" button advances to tooltip 2
- Auto-dismisses after 6s

**Tooltip 2 — "The Safety Net" (appears after tooltip 1)**
- Points at the streak count or XP bar area
- Text: "Miss a day? **No problem.** The system forgives one miss — but two in a row resets your streak. This isn't about perfection. It's about **never skipping twice.** "
- "Start My Journey →" button dismisses and opens the welcome banner

### The Banner Persists
After tooltips, a small persistent banner at the top of the dashboard:
"You're on a **1-day streak** of becoming someone who **[identity goal]** . 🔥 Don't skip twice."
This stays for 3 days, then auto-dismisses.

---

## Technical Integration Plan

### Files to create:
1. `src/components/growth/IdentitySetupFlow.jsx` — the entire 5-phase orchestration component
2. `src/components/growth/IdentityHook.jsx` — Phase 1 splash
3. `src/components/growth/IdentityIntake.jsx` — Phase 2 questions
4. `src/components/growth/ProcessingAnimation.jsx` — Phase 3 loading
5. `src/components/growth/BlueprintPanel.jsx` — Phase 4 plan refinement
6. `src/components/growth/DashboardHandoff.jsx` — Phase 5 tooltips + transitions
7. `src/hooks/useIdentityBlueprint.js` — the "AI" logic mapping identity → habits + anchors

### Files to modify:
1. `src/lib/SIContext.jsx` — add `identity_goal` to DEFAULT_SETTINGS, store identity goal
2. `src/lib/SILayout.jsx` — replace `<GrowthSplash>` + `<GrowthSetupModal>` with `<IdentitySetupFlow>`

### Files to deprecate (keep but stop importing):
- `src/components/growth/GrowthSplash.jsx`
- `src/components/growth/GrowthSetupModal.jsx`

---

## Edge Cases & Considerations

- **Returning user:** If `has_completed_setup` is true AND `has_completed_splash` is true, skip the entire flow. Show a condensed "Welcome back" variant only if they're logging in after a long absence.
- **Power user:** Someone with existing habits who enters settings → the "Re-run Setup" button in Settings re-triggers Phase 2-5 only (skips the hook).
- **Zero data fallback:** If the "AI" can't map the identity, default to the Balanced Growth → Productivity stack with 3 generic micro-habits.
- **Mobile-first:** All modals are full-screen on mobile (<640px), centered max-w-md on desktop.
- **Accessibility:** Every interactive element has aria-labels. Processing animation respects `prefers-reduced-motion`.