# Education Module Enhancement Plan

## Current State Summary

The Education module has **5 live pages** + **5 hidden-but-complete pages** (redirected but fully built).

### Live Pages

| Page | Route | What It Does | What's Missing |
|------|-------|-------------|----------------|
| **EduHome** (`/education`) | Landing hub | Up Next deadline, Start Focus button, Vitals (tasks%, check-ins, courses), Stats card, AI Assistant toggle, Work-Study Balance toggle, Quick Nav cards | No weekly study goal ring, no streak, no semester progress (week X/Y), no exam pressure indicator, no live Pomodoro quick-start |
| **EduFocusHub** (`/education/focus`) | Weekly calendar grid | 8am–7pm time grid, classes from course schedules, tasks with scheduled times, prev/next week nav | `selectedSlot` state is dead (click does nothing), no month/day view, no task creation from grid, no study session overlay, no today button, cramped on mobile |
| **EduVault** (`/education/vault`) | Course hub + grades | Course list/grid, course detail (header, outline, grade breakdown, grade needed calculator, performance chart), AI tutor, add course | No GPA dashboard overview, no assignment status tracking, no course risk assessment, no study time per course, no exam countdown, no materials upload |
| **EduTimer** (`/education/timer`) | Study timer | Flowmodoro (counts up, break = 1/5) + Custom (target countdown), break phase, cycle counter, ambient audio, today sessions, course/deliverable selection | No Pomodoro preset (25/5), no session notes save (notesOpen exists but notesDraft isn't persisted), no daily/weekly focus goal, no streak integration, no post-session summary card |
| **EduSettings** (`/education/settings`) | Settings | Google Calendar connect/sync, profile wizard, task types, theme, UI size, nav customization, university selector, catalog refresh, danger zone | No notification preferences, no data export/import, no achievements display, no semester management, no backup/restore, no keyboard shortcuts guide |

### Hidden but Complete Pages (currently redirecting)

| Hidden Page | Content | Best Action |
|-------------|---------|-------------|
| **EduDashboard** | Today's Focus, Upcoming Deliverables, Upcoming Focuses (7d), ExamCountdown, Daily Schedule, ProductivityCompare, Quick Stats, AI Assistant | **Merge into EduHome** — EduHome is too sparse compared to this |
| **EduAnalytics** | Streaks, study heatmap, peak energy, course breakdown rings, weekly summary, transcript trend, GPA projection, course load advisor, session notes | **Restore as nav page** (`/education/analytics`) or sub-tab in Vault |
| **EduCourses** | Work-study balance, textbook costs with push-to-finance, quick add courses | **Merge into Vault** as a tab/section |
| **EduGrades** | What-if grade simulator, per-course grade targets, transcript GPA, scholarship threshold | **Merge into Vault** as a tab/section |
| **EduSchedule** | Full schedule with day/week/month/year frames, Google Calendar sync, color-coded by course/type, task modal | **Merge into Focus Hub** — Focus Hub is the sparse week view, this is 4x more capable |

---

## Part A — Cross-Cutting Intuition Fixes

**1. Eliminate the Home vs Focus Hub overlap**
- EduHome shows a "Today's Schedule" preview; Focus Hub shows the full week. These duplicate intent.
- **Fix:** Make EduHome a true command center (dashboard-style, pulling from EduDashboard's best features), and Focus Hub strictly the calendar/schedule view.

**2. Stop hiding polished pages behind redirects**
- EduDashboard, EduAnalytics, EduCourses, EduGrades, EduSchedule are all complete — redirecting wastes the work.
- **Fix:** Surface Analytics as a 5th nav page, merge Courses+Grades tabs into Vault, merge Schedule features into Focus Hub, merge Dashboard features into Home.

**3. Add semester progress context everywhere**
- No page shows "Week 6 of 14" — critical for a student's situational awareness.
- **Fix:** Add a semester progress bar to the top bar (EduTopBar) or every page header.

**4. Connect study time to calendar**
- Focus Hub shows classes but not study sessions. The timer logs sessions but they don't appear on the calendar.
- **Fix:** Overlay study session durations on the calendar grid (same as classes).

**5. Unify the streak (study streak vs journal streak)**
- The analytics page has a study streak. There's no journaling streak. Growth module has its own streak system.
- **Fix:** Surface the study streak on Home and Focus Hub, and align with Growth's streak badge system.

**6. Fix dead/unused UI states**
- `selectedSlot` in FocusHub is set but never used — clicking a time slot does nothing.
- `notesOpen`/`notesDraft` in Timer open a dialog but the notes aren't persisted to the session log.
- Several EduHome stats are hardcoded placeholders ("Study Hours" = `weekCheckins * 0.5`).

---

## Part B — Per-Page Enhancements

### 1. EduHome — From Landing Hub to Command Center

**Intuition fixes:**
- Replace the static "Stats" card with real data from hidden EduDashboard (weekly focus minutes, streak, courses, upcoming exams)
- Show semester progress: "Week 6 of 14 · Fall 2026"
- Add a "Today's Overview" card that combines Up Next + Today's Focus in one place
- Fix the placeholder "Study Hours" stat (currently `weekCheckins * 0.5` — use actual `weeklyMinutes`)

**New features:**
- **Quick-study inline timer** — one-tap "Start 25m" button that starts a countdown without navigating away (like FocusRow in EduDashboard)
- **Weekly study goal ring** — circular progress toward the user's weekly study target (configurable per course)
- **Exam pressure card** — "3 exams in 14 days" with a countdown to the nearest one (pull from `deliverables.filter(is_exam)`)
- **Today's focus list** — show planned focus sessions for today (already in EduDashboard, missing from EduHome)
- **Streak indicator** — current study streak with streak fireplace icon
- **AI assistant always visible** — toggle is fine but show a contextual prompt by default (e.g., "3 assignments due this week — want help planning?")
- **Deadline timeline** — horizontal scroll of upcoming deadlines, not just the single next one

### 2. EduFocusHub — From Static Grid to Interactive Schedule

**Intuition fixes:**
- **Fix the dead `selectedSlot`** — clicking a time slot should open a "Schedule Focus Task" modal (reuse `FocusFormModal` or `ScheduleTaskModal`)
- Add **today button** to jump back to current week
- Show **study sessions** on the calendar (overlay logged timer sessions on their day/time)
- Show **deadline dots** on day headers (small red dots for deliverables due that day)
- Add **mobile-friendly week view** — on small screens, switch to a compact list instead of the 8-column grid

**New features:**
- **Multiple view modes** — the hidden EduSchedule already has Day/Week/Month/Year frames. Port them here.
- **Drag-to-create** — long-press/drag on an empty slot to create a focus task with that time block
- **Course color coding** — each course gets a color (from `course.color`), used consistently across calendar, vault, and timer
- **Conflict detection** — highlight overlapping classes/tasks in red
- **Exam highlights** — highlight days with exams in red/orange
- **"Next class" widget** — persistent card showing the upcoming class today
- **Week summary header** — "This week: 4 classes, 2 deadlines, 3.2h studied"
- **Google Calendar sync toggle** — show/hide Google Calendar events inline (already built in EduSchedule)
- **Task detail popover** — tap a calendar item to see details, mark complete, or reschedule
- **Week view print/export** — generate a printable weekly schedule PDF

### 3. EduVault — From Course Browser to Academic War Room

**Intuition fixes:**
- Currently, Vault is a "bucket" for everything academic — courses, grades, analytics, materials. Need clearer sub-navigation.
- **Fix:** Add tabbed sub-navigation: **Courses** | **Grades** | **Analytics** | **Materials**
- Show GPA prominently at the top (always visible, not just on a hidden page)
- Restore the hidden EduAnalytics page as the "Analytics" tab within Vault (or make it a standalone nav page)

**New features (Courses tab):**
- **Course status badges** — Active, Completed, In Progress, At Risk (based on grade < 60%)
- **Materials upload** — store syllabus PDFs, notes, and link them to courses
- **Textbook cost tracker** (already built in hidden EduCourses — restore it)
- **Quick-add courses** (already built in hidden EduCourses — restore it)
- **Course comparison** — side-by-side grade, workload, and study time comparison
- **Deadline overview per course** — show all deliverables grouped by course with completion status

**New features (Grades tab):**
- **Restore EduGrades** as a Vault sub-tab — what-if simulator, per-course grading, transcript GPA, scholarship threshold
- **Grade trend line** — chart grade changes over time (per assignment, not just a single bar chart)
- **What-if side panel** — always visible when viewing a course's grades, showing "if you get X on the final, you'll end with Y%"
- **Target GPA calculator** — "What grade do I need in each course to hit a 3.5 GPA?"
- **Letter grade distribution** — show how many A/B/C/D/F grades you have
- **Semester GPA vs cumulative GPA** — show both clearly

**New features (Analytics tab):**
- **Restore EduAnalytics** as a sub-tab — study heatmap, peak energy, course breakdown rings, weekly summary, course load advisor, session notes
- **Mood-study correlation** — "You study most effectively in the morning" (already has peak energy data)
- **Weekly report card** — auto-generated weekly summary of study hours, completion rate, streak changes
- **Attendance tracking** — mark classes attended, show attendance rate per course
- **Grade prediction** — "Based on your current trajectory, you'll finish with a B+ in CSC110"
- **Study time vs grade scatter** — is more study time correlated with higher grades?

### 4. EduTimer — From Simple Timer to Focus System

**Intuition fixes:**
- `notesOpen`/`notesDraft` state exists but notes aren't saved — the dialog opens after each session but the text is discarded. **Fix:** Persist session notes as part of the study session log.
- No Pomodoro preset (25 min study / 5 min break) — add it alongside Flowmodoro and Custom
- Show session count for today on the timer page itself
- Allow course/deliverable selection inline (currently only works via URL params)

**New features:**
- **Pomodoro mode** — 25 min study / 5 min break / 15 min long break after 4 cycles
- **Session notes** — persist notes per session, show them in TodaySessions and SessionNotesList
- **Daily focus goal** — "Today's target: 4 sessions" with progress indicator
- **Session summary card** — after each session, show a brief overlay: "Great focus! 45 min on CSC110. You studied 3h this week."
- **Streak-friendly timer** — completing a session of 25+ minutes counts toward the study streak
- **Keyboard shortcuts** — Space = start/pause, R = reset, N = new session, Esc = close
- **Fullscreen mode** — distraction-free fullscreen timer (no nav, just the timer ring)
- **Ambient sound presets** — lofi, rain, cafe, white noise (already has AmbientAudio component — expand it)
- **Focus history mini-chart** — show the last 7 days of study minutes in a small bar chart below the timer
- **Auto-link to Growth Pomodoro** — if Growth module is active, log a Pomodoro session there too
- **Break suggestions** — "Stretch for 2 minutes" or "Hydrate" during break

### 5. EduSettings — From Setup to Control Center

**Intuition fixes:**
- The settings page is already solid — 527 lines of well-organized settings. The main gap is **no notification preferences** and **no data management**.
- Group settings into collapsible sections: Account, Calendar, Study Preferences, Personalization, Data, Advanced

**New features:**
- **Notification preferences** — toggle browser notifications for: upcoming deadlines (24h before), streak reminders, daily study plan, weekly summary, exam reminders
- **Daily reminder time** — time picker for daily study reminder notification
- **Data export/import** — export all education data as JSON; import to restore from backup
- **Achievement gallery** — show earned badges/achievements (study streak milestones, session count milestones, course completion)
- **Semester management** — create, edit, or switch semesters manually (not just auto-detect)
- **Backup & restore** — one-click backup of all course and schedule configurations
- **Keyboard shortcuts reference** — show all available keyboard shortcuts
- **What's new / changelog** — a small modal showing recent changes to the education module
- **Theme sync with Finance** — option to apply the same theme across both modules
- **Study preferences** — default timer mode, default session duration, break ratio

---

## Part C — Cross-Cutting Features

| Feature | Pages Affected | Description |
|---------|---------------|-------------|
| **Semester Progress Bar** | Top bar (all pages) | "Week 6 of 14 · Fall 2026" — always visible in EduTopBar |
| **Study Streak Everywhere** | Home, Timer, Focus Hub | Show streak count in the top bar, animate on session completion |
| **Unified AI Assistant** | Home, Vault, Focus Hub | Context-aware assistant that knows which page you're on and suggests relevant actions |
| **Command Palette** | All pages (Ctrl+K) | Quick-search: courses, deadlines, actions like "Start timer", "Add course", "View schedule" |
| **Achievement System** | Home, Vault, Settings | Milestones: First Session, 10h Studied, 7-Day Streak, First A+, All Courses Complete |
| **Data Sync Status** | All pages | Show last sync time, connection status to backend (cloud icon in top bar) |
| **Onboarding Tour** | First visit | After profile wizard, show a 5-step highlight tour of Home → Focus Hub → Vault → Timer → Settings |
| **Weekly Review Modal** | Home (Monday auto-trigger) | "Last week: 8.2h studied, 4/5 courses on track, 2 deadlines completed" |
| **Growth Module Integration** | Home, Timer, Settings | Share XP/leveling with Growth module — study sessions earn XP, level up unlocks themes |
| **Mobile Optimizations** | Focus Hub, Vault | Focus Hub grid is unusable on iPhone — needs compact week view. Vault needs tighter cards. |
| **Push to Finance** | Vault (Courses) | Textbook costs, tuition fees — push line items to the Finance module (already has a stub button) |

---

## Part D — Implementation Priority

### Phase 1 (High Impact, Low Effort)
- Fix dead `selectedSlot` in FocusHub (click → open FocusFormModal)
- Persist session notes in EduTimer (save notesDraft to study session record)
- Fix placeholder stats in EduHome (use real `weeklyMinutes`, real streak, real exam count)
- Add today button to FocusHub
- Add semester progress bar to EduTopBar
- Add Pomodoro preset to EduTimer (25/5)
- Surface study streak on EduHome

### Phase 2 (Medium Impact, Medium Effort)
- **Merge EduDashboard features into EduHome** — Today's Focus, ExamCountdown, Quick Stats, Upcoming Deliverables (the code already exists, just needs wiring)
- **Restore EduAnalytics as a nav page** at `/education/analytics` — it's fully built, just needs a nav entry and route
- **Merge EduSchedule features into FocusHub** — day/week/month/year views, Google Calendar sync overlay, color coding
- **Merge EduGrades into Vault as a tab** — what-if simulator, transcript GPA, scholarship threshold
- **Merge EduCourses into Vault as a tab** — textbook costs, quick-add, work-study balance
- Add keyboard shortcuts to EduTimer
- Add daily focus goal to EduTimer
- Add deadline dots to FocusHub calendar day headers
- Add notification preferences to EduSettings

### Phase 3 (High Impact, Higher Effort)
- Tabbed sub-navigation in Vault (Courses | Grades | Analytics | Materials)
- Grade trend line chart (per-course grade changes over time)
- Study session overlay on FocusHub calendar
- Drag-to-create focus tasks on calendar
- Achievement/badge system for education milestones
- Weekly review modal (auto-triggered)
- Data export/import in EduSettings
- Command palette (Ctrl+K) across all pages
- Full-screen mode for EduTimer

### Phase 4 (Polishing)
- Mood-study correlation analysis
- Grade prediction / what-if everywhere
- Scatter plot: study time vs grade
- Attendance tracking per course
- Push-to-Finance for textbook costs (actual integration)
- Growth module XP integration (study → XP)
- Theme sync between Finance and Education
- Mobile-responsive FocusHub (compact week view for iPhone)
- Printable weekly schedule
- Onboarding tour after profile wizard
- What's new / changelog in settings