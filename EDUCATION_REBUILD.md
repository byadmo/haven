# EDUCATION_REBUILD.md — Consolidation Plan

## Old → New Route Mapping

| Old Route | Old Page | New Route | New Page |
|---|---|---|---|
| `/education` | EduDashboard | `/education` | EduHome (Bento Dashboard) |
| `/education/schedule` | EduSchedule | `/education/focus` | EduFocusHub |
| `/education/timer` | EduTimer | → merged into Focus Hub | — |
| `/education/courses` | EduCourses | `/education/vault` | EduVault |
| `/education/grades` | EduGrades | → merged into Vault | — |
| `/education/analytics` | EduAnalytics | → merged into Vault | — |
| `/education/settings` | EduSettings | `/education/settings` | EduSettings (kept) |

## Navigation (navConfig.js)
- Removed: courses, schedule, flowmodoro, grades, analytics, settings from primary
- New: home, focus, vault, settings

## File Changes

### New Files
- `src/pages/edu/EduHome.jsx` — Bento Dashboard (View 1)
- `src/pages/edu/EduFocusHub.jsx` — Schedule + Timer (View 2)
- `src/pages/edu/EduVault.jsx` — Courses + Grades + Analytics (View 3)

### Modified Files
- `src/App.jsx` — Update routes, add redirects
- `src/lib/navConfig.js` — Update EDU nav entries
- `src/lib/eduSyncContext.jsx` — Wire splash, remove old nav refs