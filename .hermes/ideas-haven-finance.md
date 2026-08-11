# Haven Finance — Intuitiveness & Feature Ideas

## 🧭 Cross-Cutting Improvements (Every Page)

| Idea | Why It Matters |
|------|---------------|
| **Cmd+K Command Palette** — search, navigate, quick-add from anywhere | Eliminates hunting through nav for what you need |
| **Global Search** — one search bar finds transactions, goals, debts, accounts | Single entry point, like Spotlight |
| **Contextual "Ask AI" button** on every page — pre-seeded with the page's data | "What's my biggest spending leak this month?" right from the Overview |
| **Keyboard shortcuts** — `g o` → Goals, `g d` → Debts, `g a` → Allocation | Power-user speed |
| **Undo toast** — every action (log payment, delete transaction) shows "Undo?" for 5s | Fear-free data entry |
| **Pin to Dashboard** — star icon on any widget, it appears on the Overview | Customizable without a full settings page |
| **Year-over-year toggle** — flip a switch on any chart to see last year's line | Context without context-switching |
| **Data sync status** — subtle "Last synced 2m ago" badge | Trust in the numbers |
| **Batch select mode** — checkboxes on transactions/debts, then bulk-categorize/delete | Saves clicks on cleanup days |
| **Mobile swipe gestures** — swipe left to delete, right to mark paid | Thumb-friendly UX |
| **PDF Monthly Report** — one-tap export of the current month's summary | Tax season, landlord, budgeting reviews |

---

## 📊 FinancialDashboard (`/overview`)

### Current features
Net liquidity hero, monthly cash flow, 30-day forecast bar, Income vs Spending chart (expandable), Upcoming & Recurring, Cash Flow Analytics, quick-action buttons, Pomodoro timer.

### Intuitiveness fixes

- **"Spendable Today" widget** — net liquidity minus upcoming bills due before next paycheque. Tells you "you have $X to spend right now" instead of a raw number that includes rent money.
- **Daily burn rate** — `(this month's expenses so far) / (days elapsed)`. Paired with a projected month-end total. "You're on track to spend $4,200 this month."
- **Mini bill calendar** — horizontal scroll of the next 7 days with bill amounts on each day. At a glance: "Thursday has a $1,200 rent payment."
- **Quick transaction search** — always-visible search bar at the top of the page. Type a merchant name, jump to the transaction.
- **AI Monthly Summary strip** — "You spent 12% more on dining out this month. Your savings rate is 23%. Top category: Groceries ($840)." Generated from current data, no API call.
- **Empty states** — when no transactions exist, show a friendly "Drop a statement or add your first transaction" CTA instead of a blank chart.
- **Net worth sparkline** — 6-month mini line chart in the hero bar area. Shows direction at a glance.
- **Recurring bill countdown** — "3 bills due in the next 5 days totaling $1,850" pill.

### New features

- **This Week / This Month / This Year** quick-filter tabs on the income/spending chart
- **Cash flow alert** — "You've spent 80% of your monthly income with 10 days left"
- **Top spending categories** as clickable horizontal bars — click to drill into transactions
- **Savings rate ring** — % of income saved this month, animated ring
- **Payday countdown** — days until next expected income

---

## 📈 FinancialAllocation (`/allocation`)

### Current features
Zero-based allocation bar, metric cards, credit health ring, spending breakdown, Budget AI insights, spending insights, financial health score, goal planner, investment portfolio.

### Intuitiveness fixes

- **50/30/20 overlay** — toggle to overlay the 50/30/20 rule (Needs/Wants/Savings) on the actual allocation. See where you deviate.
- **Drag-to-adjust allocation** — drag category slices to reallocate, see the effect on surplus instantly. Like a circle chart you can edit.
- **Paycheque preview** — show next payday's expected split: "Your next $2,800 → $1,200 bills + $800 savings + $800 spending."
- **Subscription radar** — a card that lists all recurring subscriptions with total monthly cost. "You're spending $180/mo on 6 subscriptions."
- **Category drill-down** — tap a category bar → see all transactions in that category this month → tap a transaction → edit it. No page navigation.
- **"You could save" insight** — "If you cut dining out by 30%, you'd save $120/mo = $1,440/yr."

### New features

- **Envelope system toggle** — flip into "envelope mode" where each category has a hard cap and shows remaining budget
- **Recurring vs one-time split** — separate view of recurring obligations vs discretionary spending
- **Allocation comparison** — this month vs last month, as a side-by-side stacked bar
- **Budget rollover** — unused budget in one category carries to next month (configurable)
- **Sinking funds** — set aside small monthly amounts for annual expenses (car insurance, Christmas, etc.)

---

## 🎯 Goals (`/goals`)

### Current features
CRUD goals with progress bars, quick-add buttons (+$50/$100/$250), category/priority, target date, auto-complete.

### Intuitiveness fixes

- **Goal timeline roadmap** — visual timeline showing all goals on a calendar scale. "Debt-free by Nov 2026 → Emergency fund by Mar 2027 → House down payment by Jun 2028."
- **"What-if" slider** — "If I add $X extra per month..." → instantly see how much sooner each goal completes. Same slider pattern as the Debt page but for goals.
- **Goal grouping** — collapsible groups by category (Savings, Debt Payoff, Investment). Shows group total progress.
- **Auto-suggest goals** — based on spending patterns: "You spend $180/mo on subscriptions. Want to set a goal to review and cut them?"
- **Goal contribution schedule** — set recurring transfers to a goal (e.g., $200 automatically every payday). Shows "on track" vs "falling behind."
- **Goal dependencies** — "Pay off Card A only after Emergency Fund reaches $5,000." Chain goals together.
- **Milestone celebrations** — confetti at 25%, 50%, 75%, 100%. Motivational.

### New features

- **Goal progress photos** — upload a photo at each milestone (e.g., "Day 1 of debt payoff" → "6 months in")
- **Shared goals** — invite a partner, track combined progress
- **Interest saved counter** — for debt-payoff goals: "By paying $500/mo extra, you'll save $2,300 in interest"
- **Goal templates** — "Emergency Fund (3 months expenses)", "Vacation ($3,000)", "New Car ($15,000)" — pre-filled, just adjust the number
- **Goal forecast chart** — line chart showing projected balance over time, with a "current pace" line and "goal pace" line

---

## 💳 Debts (`/debts`)

### Current features
Interest accrual (daily cost), debt-free projection with slider, Snowball vs Avalanche comparison, liability ledger with payment logging, edit, pay-off target, confetti on payoff.

### Intuitiveness fixes

- **Debt-free countdown** — a prominent "2 years, 4 months, 12 days until debt-free" counter. Big, bold, motivational.
- **Debt avalanche optimizer** — "Right now, pay $100 extra to Card B — it saves you the most interest today." Refreshes based on current balances.
- **Payment history chart** — line chart of balance over time with payment markers. Shows progress visually.
- **"Burn rate" comparison** — show each debt's daily interest cost sorted. "Card A burns $2.14/day. Card B burns $0.89/day."
- **Interest saved tracker** — "You've saved $340 in interest by paying extra so far this year."
- **Balance transfer calculator** — "If you transfer Card A's $5,000 to a 0% APR card for 12 months, you'd save $1,200 in interest."
- **Debt consolidation view** — "Your total monthly minimum is $680. If you consolidated at 8%, it would be $590/mo."

### New features

- **Debt payoff ladder** — visual cascade: pay off the smallest first, it drops off, the freed-up minimum rolls into the next. Animated.
- **Creditor dashboard** — store due dates, auto-pay status, account numbers, portal links per debt
- **"What if I stop spending?"** mode — toggle to show debt-free date with zero new spending vs normal spending
- **Debt stress score** — composite of utilization × interest rate × months to payoff. Green/yellow/red.
- **Automated payment reminders** — "Your minimum payment of $35 on Card C is due in 3 days."

---

## 📊 CreditUtilization (`/credit-utilization`)

### Current features
Overall utilization gauge, per-card breakdown with 30% threshold marker, recommendations (pay $X to reach 30%), utilization history placeholder.

### Intuitiveness fixes

- **Utilization history chart** — line chart over the last 12 months. Show trend direction. This replaces the current placeholder.
- **Trend arrow** — simple up/down/flat indicator next to each card. "↑ 3% from last month."
- **"What affects your score" explainer** — 3-4 small cards: Payment History (35%), Utilization (30%), Length of History (15%), etc. Each with your current status.
- **Score simulator** — "If you pay $500 on Card A, your utilization drops from 65% to 42%." Instant feedback.
- **Payment timing optimizer** — "Your statement closes on the 15th. Pay $400 before that date to report a lower balance to the bureau."
- **Credit limit increase calculator** — "If Card A approved a limit increase from $5,000 to $8,000, your utilization on this card would drop from 65% to 40%."
- **Threshold callouts** — percentage-of-limit markers at 10% (excellent), 30% (warning), 50% (poor), 75% (critical) with color coding.

### New features

- **Credit mix overview** — show which types of credit you have (revolving, installment, etc.) and what's missing
- **Hard inquiry tracker** — log when you last applied for credit, show 2-year rolling window
- **Average age of accounts** — "Your oldest account is 4.2 years old. Average: 2.8 years."
- **"Path to 760"** — actionable steps to reach an excellent score tier
- **Monthly utilization report** — auto-generated: "This month you averaged 22% utilization. Your lowest was 15%, highest was 35%."

---

## 🧩 Quick Wins (High Impact, Low Effort)

These are small changes that would dramatically improve feel:

1. **Sticky header** — page title + key metric stays visible while scrolling
2. **Skeleton loading** — shimmer placeholders for every card (especially Goals and Debts) instead of the current spinner
3. **Tap-to-copy amounts** — long-press or tap any dollar amount to copy it
4. **Relative dates** — "Due in 2 days" instead of "2026-08-12"
5. **Animated number transitions** — when a value changes, count up/down instead of blinking
6. **Empty state illustrations** — simple SVG illustrations for no goals, no debts, no transactions
7. **Pagination hints** — "Showing 5 of 23 transactions" with a "Show all" link
8. **Persistent quick-add** — floating "+" button on every page, slides up a bottom sheet

---

## 📋 Prioritization

### Phase 1 — Quick Wins (this week)
- Cmd+K command palette (search + navigate)
- Undo toast on actions
- Relative dates everywhere
- Empty state illustrations
- Sticky headers
- Spendable Today widget on dashboard

### Phase 2 — Core UX (next sprint)
- Contextual "Ask AI" on every page
- Goal timeline roadmap
- Debt-free countdown counter
- Year-over-year toggle on charts
- Utilization history chart
- Pin-to-dashboard

### Phase 3 — Advanced Features
- 50/30/20 overlay on allocation
- Envelope budget mode
- Goal dependency chaining
- Score simulator
- PDF monthly report export
- Shared goals

### Phase 4 — Power User
- Keyboard shortcuts
- Batch select mode
- Drag-to-adjust allocation
- Credit mix + score explainer
- Hard inquiry tracker
- Automated payment reminders