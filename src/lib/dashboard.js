import { base44 } from "@/api/base44Client";

export async function invokeFunc(name, payload) {
  const res = await base44.functions.invoke(name, payload);
  return res.data;
}

export function money(n) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(n || 0));
}

export function pct(n) {
  return `${Number(n || 0).toFixed(1)}%`;
}