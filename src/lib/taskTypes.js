// Default task types for EduSync focus tasks. Persisted overrides live on
// EduSettings.task_types (array of { name, color }); this module resolves the
// effective list and the color/label for a given task type.

export const DEFAULT_TASK_TYPES = [
  { name: "Reading", color: "#3b82f6" },
  { name: "Studying", color: "#a855f7" },
  { name: "Homework", color: "#f59e0b" },
  { name: "Assignment", color: "#14b8a6" },
  { name: "Lab", color: "#06b6d4" },
  { name: "Review", color: "#f43f5e" },
  { name: "Exam Prep", color: "#ef4444" },
  { name: "Project", color: "#10b981" },
];

export function resolveTaskTypes(settings) {
  const t = settings?.task_types;
  if (Array.isArray(t) && t.length) return t;
  return DEFAULT_TASK_TYPES;
}

export function taskTypeMeta(name, settings) {
  const list = resolveTaskTypes(settings);
  const found = list.find((x) => x.name === name);
  if (found) return found;
  return { name: name || "Studying", color: "#a855f7" };
}