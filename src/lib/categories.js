import React from "react";
import { base44 } from "@/api/base44Client";

export const DEFAULT_CATEGORIES = [
  "Income",
  "Transit (GO/TTC)",
  "E39/Civic Maintenance",
  "Christ Like! Inventory",
  "Food/Groceries",
  "Rent",
  "Utilities",
  "Dining",
  "Other",
];

export function categoryOptions(categories) {
  return categories.length ? categories.map((c) => c.name) : DEFAULT_CATEGORIES;
}

export function useCategories() {
  const [categories, setCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    const list = await base44.entities.Category.list("name");
    setCategories(list);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    reload().catch(() => setLoading(false));
  }, [reload]);

  const add = async (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return null;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return null;
    const created = await base44.entities.Category.create({ name: trimmed });
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  };

  const remove = async (id) => {
    await base44.entities.Category.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const restoreDefaults = async () => {
    const existing = new Set(categories.map((c) => c.name));
    const toAdd = DEFAULT_CATEGORIES.filter((n) => !existing.has(n));
    if (toAdd.length) await base44.entities.Category.bulkCreate(toAdd.map((name) => ({ name })));
    await reload();
  };

  return { categories, loading, add, remove, restoreDefaults, reload };
}