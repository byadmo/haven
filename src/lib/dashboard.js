import { base44 } from "@/api/base44Client";

export async function invokeFunc(name, payload) {
  const res = await base44.functions.invoke(name, payload);
  return res.data;
}

export function money(n) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(n || 0));
}

// Compact money formatting for tight boxes (calendar cells, etc.).
// Drops cents and abbreviates large values so amounts never overflow.
export function moneyCompact(n) {
  const v = Number(n || 0);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function pct(n) {
  return `${Number(n || 0).toFixed(1)}%`;
}