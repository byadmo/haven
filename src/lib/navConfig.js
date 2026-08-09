// Canonical navigation catalogs + resolution helpers shared by the
// customizable nav bars in both Haven Finance and Haven Education.
//
// A user's nav config is just an array of page-id strings in display order
// (stored on UserFinancialProfile.nav_items / EduSettings.nav_items). Pages
// omitted from that array fall into the "More" dropdown. The locked page
// (overview / dashboard) is always force-included at the front if missing.

import {
  LayoutDashboard, CreditCard, PiggyBank, PieChart, Activity, Briefcase,
  TrendingUp, Gauge, Wallet, ArrowLeftRight, Sparkles,
  Settings as SettingsIcon,
  BookOpen, CalendarDays, Timer, GraduationCap, BarChart3,
} from "lucide-react";

export const FINANCE_PAGES = [
  { id: "overview", to: "/overview", label: "Overview", icon: LayoutDashboard, end: true, locked: true },
  { id: "allocation", to: "/allocation", label: "Allocation", icon: PieChart },
  { id: "debts", to: "/debts", label: "Debts", icon: CreditCard },
  { id: "settings", to: "/settings", label: "Settings", icon: SettingsIcon },
];

export const FINANCE_DEFAULT_NAV = [
  "overview", "allocation", "debts",
];
export const FINANCE_LOCKED = ["overview"];

export const EDU_PAGES = [
  { id: "home", to: "/education", label: "Home", icon: LayoutDashboard, end: true, locked: true },
  { id: "focus", to: "/education/focus", label: "Focus Hub", icon: Timer },
  { id: "vault", to: "/education/vault", label: "Academic Vault", icon: BookOpen },
  { id: "settings", to: "/education/settings", label: "Settings", icon: SettingsIcon },
];

export const EDU_DEFAULT_NAV = ["home", "focus", "vault", "settings"];
export const EDU_LOCKED = ["home"];

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