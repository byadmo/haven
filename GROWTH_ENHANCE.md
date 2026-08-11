# Growth Module Enhancement Plan

## Current State Summary

The Growth module has **6 pages** + **6 components** across a solid foundation:

| Page | What It Does | What's Missing |
|------|-------------|----------------|
| **Dashboard** (`/growth`) | XP bar, 4 stat cards, today's habits list, quick links | No XP feedback, no weekly summary, no Pomodoro integration |
| **Habits** (`/growth/habits`) | CRUD habits, toggle today, basic streak display | No difficulty selector, no scheduling, no batch toggle, no color tags |
| **Streaks** (`/growth/streaks`) | Ranked streak list, milestone progress | No streak history chart, no freeze items, no predictions |
| **Journal** (`/growth/journal`) | CRUD reflections, mood selector | No search/filter, no tags, no writing prompts, no journaling streak |
| **Analytics** (`/growth/analytics`) | 30-day heatmap, mood distribution, 4 stat cards | No trend lines, no correlation analysis, no monthly report cards |
| **Settings** (`/growth/settings`) | Profile, theme, UI scale, Google Calendar, danger zone reset | No notification preferences, no export/import, no achievements display |

**Deep Analytics** (`GrowthAnalytics.jsx`) has habit strength scores, weekday/weekend comparison, and 30-day bar chart — but isn't wired into the main nav.

**Calendar** (`GrowthCalendar.jsx`) has a monthly grid with completion dots — but isn't its own page, only shows 1 month, no click-to-expand.

**PomodoroTimer** is a floating dialog — not integrated with habits, no session logging, no break timer.

---

## Enhancement Ideas

### 1. Dashboard — From Overview to Command Center

**Intuition fixes:**
- XP earned from toggling a habit should flash/animate immediately (not calculated on page load)
- Show "Next Unlock" card: what theme/feature unlocks at the next level milestone
- Add a weekly summary card: completion rate this week vs last week, streak changes, mood trend

**New features:**
- **Quick-start Pomodoro** — one-tap button that starts a 25-min focus session inline
- **Focus Goal progress ring** — circular progress toward the user's primary focus goal
- **Today's plan** — show which habits have been done vs remaining with a visual progress bar
- **Daily quote or tip** — contextual encouragement based on streaks/level
- **Recent journal snippet** — show the latest reflection entry teaser
- **XP celebration animation** — confetti/fireworks when leveling up

### 2. Habits Page — From Simple List to Full Habit Manager

**Intuition fixes:**
- Add difficulty selector (1-5 stars) in the create dialog — it's stored but not shown
- Show habit strength score per habit inline (color-coded bar)
- Add visual scheduling: daily, weekdays, weekends, custom day picker

**New features:**
- **Batch toggle mode** — select-all and mark multiple habits done/pending at once
- **Habit color tags** — associate each habit with a color (maps to calendar)
- **Habit notes** — per-habit journal notes ("why I'm tracking this")
- **Sort & filter** — by strength score, streak length, difficulty, name
- **Weekly habit calendar** — inline mini-calendar showing which days each habit was done
- **Habit cloning** — duplicate a habit with all its settings
- **Streak freeze count** — Duolingo-style "you can miss today without breaking streak" (earned via XP milestones)

### 3. Streaks Page — From Leaderboard to Motivation Engine

**Intuition fixes:**
- Add streak history chart (not just current streak — show how it's grown over time)
- Show streak "at risk" indicators when a habit hasn't been done yet today

**New features:**
- **Streak prediction** — "If you keep going, you'll hit 30 days by September 5"
- **Streak milestones as achievements** — badge icons for 7, 14, 30, 60, 90, 180, 365 days
- **Comparative periods** — this month's streak count vs last month's
- **Streak safeguards** — 1 "free miss" per week per habit (configurable)
- **Streak leaderboard** — personal ranking of habits by streak (already exists) with better visual hierarchy
- **XP earned per streak** — show how much XP each streak has earned cumulatively
- **Streak freeze shop** — spend XP to buy streak freezes

### 4. Journal Page — From Simple CRUD to Reflection Hub

**Intuition fixes:**
- Add search/filter bar — search by title, date range, or mood
- Show word count and entry streak (separate from habit streaks)

**New features:**
- **Tags/categories** — label entries with custom tags, filter by tag
- **Writing prompts** — "What made you smile today?", "What's one thing you learned?", etc.
- **Journaling streak** — dedicated streak counter for journal entries
- **Reflection templates** — save and reuse entry templates (daily review, weekly recap, gratitude)
- **Export journal** — download as Markdown or plain text
- **Entry calendar** — preview calendar showing which days have entries (similar to GitHub contribution graph)
- **AI-powered insights** — pattern detection ("You tend to feel great on days you exercise")
- **Rich text editor** — basic formatting (bold, italic, bullet lists)

### 5. Analytics Page — From Basic Stats to Growth Intelligence

**Intuition fixes:**
- Add 7-day moving average trend line to the completion chart
- Color-code habit strength scores with clear thresholds (red/yellow/green)

**New features:**
- **Habit-mood correlation** — "When you complete your exercise habit, you're 40% more likely to report a 'great' mood"
- **Monthly report card** — auto-generated summary at month end (completion rate, top habit, streak record, mood average)
- **Shareable milestone cards** — generate a PNG card showing "I've maintained a 30-day streak!" to share
- **Predictions** — "Based on your current trajectory, you'll reach a 50-day streak in 3 weeks"
- **Period comparison** — compare this month's stats to last month's
- **Achievement badges display** — show all earned badges in a grid
- **Consistency score** — a single composite metric (0-100) incorporating streak, completion rate, and habit strength
- **Weakest habit spotlight** — highlight the habit with the lowest score and suggest improvements

### 6. Calendar — From Hidden Component to Full-Featured Page

Currently `GrowthCalendar` is a component, not a nav page. Making it a page allows:

**Intuition fixes:**
- Make it a proper nav page at `/growth/calendar`
- Click on a day to see which habits were done/missed with details
- Show habit-specific colors on the calendar cells

**New features:**
- **Week view toggle** — switch between month and week view
- **Future scheduling** — see which days have habits scheduled (custom schedules)
- **Day detail popover** — tap a day to see habit-by-habit breakdown, journal entries on that day, Pomodoro sessions
- **Year overview** — mini heatmap of the whole year (GitHub-style)
- **Notes on calendar** — attach a note to a specific date
- **Habit streaks visible on calendar** — highlight streak runs

### 7. Pomodoro Timer — From Standalone Dialog to Focus System

**Intuition fixes:**
- Make session length configurable (15/25/50/90 min)
- Add break timer (5 min short break, 15 min long break after 4 cycles)

**New features:**
- **Session logging** — track how many Pomodoros completed per day, per habit, with timestamps
- **Habit-linked sessions** — start a Pomodoro "for" a specific habit, auto-log it
- **Daily focus stats** — "Today: 4 sessions, 1h 40m focused"
- **Sound notifications** — gentle chime at session end, optional ambient sounds
- **Focus history** — chart of daily focus time over the past week/month
- **Integration with Education module** — Pomodoro for study sessions
- **XP reward for focus sessions** — complete a Pomodoro → earn XP

### 8. Settings — From Basic to Complete Control Center

**Intuition fixes:**
- Move notification/reminder settings into their own section with actual functionality
- Show achievement/badge progress in settings

**New features:**
- **Daily reminder notifications** — time picker with actual browser notification support
- **Export/import data** — download all habits, entries, reflections as JSON; import to restore
- **Achievement gallery** — full screen of all badges and unlock conditions
- **Notification preferences** — toggle streak reminders, journal prompts, weekly summaries
- **Data sync status** — last sync time, backend status indicator
- **Habit backup** — one-click backup of all habit configurations
- **Keyboard shortcuts reference** — for power users

### 9. Cross-Cutting Features (Affect Multiple Pages)

- **Achievement & Badge System** — earn badges for milestones (first habit, 7-day streak, 30-day streak, 100 check-ins, level 5, etc.). Display on dashboard, analytics, and settings.
- **XP Everywhere** — show XP in the top nav bar (always visible), animate XP gains on habit toggle
- **Theme Unlock Preview** — show locked themes and their unlock level in settings
- **Weekly Review Modal** — auto-triggered on Monday morning: "Last week you completed 82% of habits, set a new streak record of 14 days, and wrote 3 journal entries"
- **Habit Suggestions** — based on active habits, suggest complementary habits
- **Onboarding Flow Enhancement** — the setup wizard is solid but could include a "quick tour" after setup that highlights key features
- **Data Persistence Indicators** — show when data was last saved, connection status to backend

---

## Implementation Priority

### Phase 1 (High Impact, Low Effort)
- XP animation on habit toggle
- Difficulty selector in habit creation dialog
- Habit strength score inline on habits page
- Pomodoro session length config
- Journal search bar
- Custom nav items for calendar + deep analytics

### Phase 2 (Medium Impact, Medium Effort)
- Weekly summary card on dashboard
- Habit scheduling (daily/weekdays/weekends)
- Streak history chart
- Batch toggle habits
- Mood-habit correlation chart
- Calendar as a full page
- Pomodoro session logging + habit linking

### Phase 3 (High Impact, Higher Effort)
- Achievement/badge system
- XP/leveling visible in top nav
- Journal writing prompts + reflection templates
- Monthly report cards
- Export/import data
- Weekly review modal
- Streak freeze system

### Phase 4 (Polishing)
- AI-powered insights (mood correlation, suggestions)
- Shareable milestone cards
- Rich text editor for journal
- Year overview calendar
- Notification reminders (actual browser push)
- Keyboard shortcuts