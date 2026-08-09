# FINANCE_REBUILD.md — Consolidation Plan

## Old → New Route Mapping

| Old Route | Old Page | New Route | New Page |
|---|---|---|---|
| `/overview` | Dashboard.jsx | `/overview` | FinancialDashboard.jsx |
| `/budgeting` | Budgeting.jsx | `/allocation` | FinancialAllocation.jsx |
| `/cashflow` | CashFlow.jsx | → merged into Dashboard | — |
| `/forecast` | Forecast.jsx | → merged into Dashboard | — |
| `/insights` | Insights.jsx | → merged into Allocation | — |
| `/credit-utilization` | CreditUtilization.jsx | → merged into Allocation | — |
| `/goals` | Goals.jsx | → redirects to `/allocation#goals` | — |
| `/portfolio` | Portfolio.jsx | → redirects to `/allocation` | — |
| `/accounts` | Accounts.jsx | → already removed from nav | — |
| `/transactions` | Transactions.jsx | → already removed from nav | — |

**Design Language:** Copy Growth's SILayout pattern — floating nav pill, sticky header, responsive grid.

**Theme:** WealthSimple teal/emerald palette for Financial accent.

## File Changes

### New Files
- `src/pages/finance/FinancialDashboard.jsx` — Command Center (View 1)
- `src/pages/finance/FinancialAllocation.jsx` — Allocation & Health (View 2)

### Modified Files
- `src/App.jsx` — Update routes, add redirects
- `src/components/finance/DashboardHeader.jsx` — Match Growth's nav style

### Deletions (after routes are updated)
- `src/pages/CashFlow.jsx`
- `src/pages/Forecast.jsx`
- `src/pages/Insights.jsx`
- `src/pages/CreditUtilization.jsx`

## Component Architecture (View 1: Command Center)

```
FinancialDashboard
├──  HeroBar (Total Liquidity, Monthly Cashflow, 30-day Forecast)
├──  UpcomingRecurring (7-day + 30-day visual timeline)
└──  QuickLog (single-input transaction entry with autocomplete)
```

## Component Architecture (View 2: Allocation & Health)

```
FinancialAllocation
├──  ZeroBasedVisualizer (interactive budget breakdown bar)
├──  MetricCards (spending stats: total spent, top category, credit usage)
├──  CreditGauge (visual health ring with utilization %)
└──  SpendingInsights (top categories + trends)
```