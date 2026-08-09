# Haven App Optimization & Enhancement Backlog

## 🟢 1. Haven Financial
- [x] **Insights Page Optimization (`/insights`):**
  - [x] Removed the 50-year Snowball vs. Avalanche strategy comparison section (`InsightsStrategyCompare.jsx`).
- [x] **UI & Flow Audit across Financial Pages:**
  - [x] Reviewed all pages (`/overview`, `/budgeting`, `/cashflow`, `/forecast`, `/credit-utilization`, `/accounts`, `/transactions`, `/goals`, `/debts`, `/portfolio`, `/settings`).
  - [x] CashFlow, Budgeting, Forecast pages are clean — no redundant charts found. Forecast already capped at 60-120 months.

---

## 📘 2. Haven Education
- [x] **AI Response Readability Optimization:**
  - [x] Updated `EduAssistant.jsx` prompt with emoji + bullet point formatting instructions.
  - [x] Updated `CourseLoadAdvisor.jsx` prompt with emoji formatting.
  - [x] Updated all 5 finance agent prompts in `agentPrompts.js` (Wei, Clu, Sno, Jue, Opi) with mandatory formatting rules.
  - [x] Updated `FinancialHealthScore.jsx`, `CashFlowSnoInsights.jsx`, `BudgetAdvisor.jsx`, `SpendingInsights.jsx`, `StockAdvisor.jsx` prompts.

---

## 🚀 3. Haven Growth (Self-Improvement)
- [x] **Onboarding & Splash Experience:**
  - [x] Created `GrowthSplash.jsx` — first-time entry splash screen with amber theme.
  - [x] Created `GrowthSetupModal.jsx` — starter habit selection wizard.
  - [x] Wired splash + setup into `SILayout.jsx` with first-time detection via `settings.has_completed_splash` / `has_completed_setup`.
- [x] **Navigation & Settings Tab:**
  - [x] Added `Settings` tab to `SI_PAGES` and nav bar in `SILayout.jsx`.
  - [x] Added `/growth/settings` route in `App.jsx`.
- [x] **Growth Settings Features:**
  - [x] **Profile Management:** Display name + primary focus goal editing.
  - [x] **Google Calendar Sync:** Connect/disconnect toggle.
  - [x] **Appearance & Theme:** Theme picker using shared `ThemeSettings` component.
  - [x] **Display Size / UI Scale:** Slider with S/M/L/XL presets, syncs globally.
  - [x] **Data Management:** Reset all Growth data with confirmation dialog.
- [x] **Data Layer:**
  - [x] Created `base44/entities/GrowthSettings.jsonc` schema (11 properties, RLS-secured).

---

## ⚙️ 4. Global / Cross-Domain System Enhancements
- [x] **Global UI Scale / Display Size Sync:**
  - [x] UI scale already uses `localStorage` (`haven:ui-scale`) — inherently global.
  - [x] Growth settings page writes to the same system, so changes apply across all modules.
- [x] **Global Theme Persistence:**
  - [x] Growth settings uses `applyTheme()` + `setStoredTheme()` from `themes.js` — same engine as Finance/Education.
  - [x] `SIContext.jsx` loads + applies saved theme on mount.
