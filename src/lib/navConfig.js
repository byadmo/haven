// Canonical navigation catalogs + resolution helpers shared by the
// customizable nav bars in both Haven Finance and Haven Education.
//
// A user's nav config is just an array of page-id strings in display order
// (stored on UserFinancialProfile.nav_items / EduSettings.nav_items). Pages
// omitted from that array fall into the "More" dropdown. The locked page
// (overview / dashboard) is always force-included at the front if missing.

import {
  LayoutDashboard, CreditCard, PiggyBank, PieChart, Activity, Briefcase,
  TrendingUp, Gauge, Wallet, ArrowLeftRight, Target, Sparkles,
  Settings as SettingsIcon,
  BookOpen, CalendarDays, Timer, GraduationCap, BarChart3,
} from "lucide-react";

export const FINANCE_PAGES = [
  { id: "overview", to: "/overview", label: "Overview", icon: LayoutDashboard, end: true, locked: true },
  { id: "debts", to: "/debts", label: "Debts", icon: CreditCard },
  { id: "budgets", to: "/budgeting", label: "Budgets", icon: PiggyBank },
  { id: "insights", to: "/insights", label: "Insights", icon: PieChart },
  { id: "cashflow", to: "/cashflow", label: "Cash Flow", icon: Activity },
  { id: "portfolio", to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { id: "forecast", to: "/forecast", label: "Forecast", icon: TrendingUp },
  { id: "credit-utilization", to: "/credit-utilization", label: "Credit Utilization", icon: Gauge },
  { id: "accounts", to: "/accounts", label: "Accounts", icon: Wallet },
  { id: "transactions", to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "goals", to: "/goals", label: "Goals", icon: Target },
  { id: "assistant", to: "/assistant", label: "Ask Wei", icon: Sparkles },
  { id: "settings", to: "/settings", label: "Settings", icon: SettingsIcon },
];

export const FINANCE_DEFAULT_NAV = [
  "overview", "debts", "budgets", "insights", "cashflow", "portfolio", "forecast", "credit-utilization",
];
export const FINANCE_LOCKED = ["overview"];

export const EDU_PAGES = [
  { id: "dashboard", to: "/education", label: "Dashboard", icon: LayoutDashboard, end: true, locked: true },
  { id: "courses", to: "/education/courses", label: "Courses", icon: BookOpen },
  { id: "schedule", to: "/education/schedule", label: "Schedule", icon: CalendarDays },
  { id: "flowmodoro", to: "/education/timer", label: "Flowmodoro", icon: Timer },
  { id: "grades", to: "/education/grades", label: "Grades", icon: GraduationCap },
  { id: "analytics", to: "/education/analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", to: "/education/settings", label: "Settings", icon: SettingsIcon },
];

export const EDU_DEFAULT_NAV = ["dashboard", "courses", "schedule", "flowmodoro", "grades", "analytics"];
export const EDU_LOCKED = ["dashboard"];

// Turn a stored config array + a page catalog into { primary, more } nav lists.
// - locked ids are always present in `primary` (prepended if missing)
// - unknown/non-existent ids are skipped silently (no broken links)
// - ids in the catalog but not in config go into `more`
export function resolveNav(config, pages, defaultNav, locked) {
  const byId = {};
  pages.forEach((p) => { byId[p.id] = p; });

  let arr;
  if (Array.isArray(config) && config.filter((x) => typeof x === "string").length) {
    arr = [...config];
  } else {
    arr = [...defaultNav];
  }
  // Force-include any locked ids at the front (in declared order).
  locked.forEach((l) => { if (!arr.includes(l)) arr.unshift(l); });

  const seen = new Set();
  const primary = [];
  for (const id of arr) {
    if (!byId[id] || seen.has(id)) continue;
    seen.add(id);
    primary.push(byId[id]);
  }
  const more = pages.filter((p) => !seen.has(p.id));
  return { primary, more };
}

export function normalizeConfig(config, defaultNav, locked) {
  let arr;
  if (Array.isArray(config) && config.filter((x) => typeof x === "string").length) {
    arr = [...config];
  } else {
    arr = [...defaultNav];
  }
  locked.forEach((l) => { if (!arr.includes(l)) arr.unshift(l); });
  // de-dupe, keep order
  const seen = new Set();
  return arr.filter((id) => (seen.has(id) ? false : (seen.add(id), true)));
}