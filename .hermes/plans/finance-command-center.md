# Haven Finance — Complete Command Center Rebuild

## Current State Assessment

**85 finance components exist** across dashboard, allocation, accounts, debts, goals, transactions, recurring bills, settings, stocks, forecasts. Everything is Base44-backed (no local-first). The dashboard has 7 sections but no unified net worth bento, no subscription management, no income tagging, no debt strategy visualizer, and no custom report engine.

## Architecture Principles

- **Theme**: emerald module accent (fixed), canvas from user's theme
- **Staggered cascades**: all grids use `containerVariants` + `staggerVariants` with 0.05s delay
- **layoutId**: stat cards use `layoutId="net-worth-card"` etc. for Bento→modal expansions
- **Tactile**: `hover:scale-105 active:scale-95` on cards and buttons, `hover:bg-white/5 transition-colors duration-300` on inputs
- **Local-first**: JSON export/import already exists in BackupModal; extend with auto-local-save on every mutation

## Build Plan (12 changes, 4 new files, 8 modified)

### New Components

1. **SubscriptionManager.jsx** — Dedicated subscription tracking widget
   - Lists all recurring bills tagged as "subscription"
   - Flags price increases (month-over-month comparison)
   - Shows annualized cost per subscription
   - "Creep detected" badges when cost changed
   - Quick "Cut" action to mark as cancelled

2. **IncomeTagManager.jsx** — Project/income stream tagging
   - Lists all income transactions grouped by project tag
   - Add/edit/remove tags on income transactions
   - Per-project totals, monthly breakdown
   - Tag chips with color coding

3. **DebtStrategyVisualizer.jsx** — Avalanche vs Snowball comparison
   - Side-by-side: avalanche (highest interest first) vs snowball (smallest balance first)
   - Timeline chart showing both paths to $0
   - Savings comparison (interest saved with avalanche)
   - Duration comparison (months to freedom)

4. **CustomReportEngine.jsx** — Report builder
   - Date range selector
   - Metric picker (income, expenses, net cash flow, savings rate)
   - Group by (month, category, tag, account)
   - Chart + table output
   - Export to CSV

### Modified Files

5. **FinancialDashboard.jsx** — Complete Bento rebuild
   - Net worth hero card (layoutId="nw-card") with animated counter
   - Assets vs liabilities donut (layoutId="assets-card")
   - Cash flow velocity gauge (layoutId="cashflow-card")
   - Debt strategy mini-summary (layoutId="debt-strategy-card")
   - AI assistant panel inline (layoutId="ai-card")
   - Subscription warning widget
   - All grids staggered, all cards hover:scale-105

6. **FinancialAllocation.jsx** — Add income tagging, subscription management
   - IncomeTagManager in a collapsible section
   - SubscriptionManager in a collapsible section

7. **FinanceDataContext.jsx** — Add local persistence layer
   - Auto-save transactions to localStorage after every Base44 sync
   - Load from localStorage as fallback when offline
   - Add subscription tags to recurring bills schema

8. **FinancialHeader.jsx** — Add Reports nav link
   - New "Reports" icon in header linking to /allocation?tab=reports

9. **navConfig.js** — Add reports to page catalog (hidden from default nav)
   - FINANCE_PAGES gets new entry for reports

### Theme & UI Polish (3 files)

10. **button.jsx** — hover:scale-105 active:scale-95 already done
11. **FinancialHeader.jsx** — Add staggered entrance to nav items  
12. **FinancialDashboard.jsx** — will-change-transform on animated Bento cards