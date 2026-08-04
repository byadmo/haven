// CAD is the app's base currency (stored numbers are treated as CAD).
// `rate` = how many units of the target currency equal 1 CAD.
export const CURRENCIES = [
  { code: "CAD", symbol: "C$", defaultRate: 1,     label: "Canadian Dollar",   decimals: 2 },
  { code: "USD", symbol: "$",  defaultRate: 0.74,  label: "US Dollar",         decimals: 2 },
  { code: "EUR", symbol: "€",  defaultRate: 0.68,  label: "Euro",               decimals: 2 },
  { code: "GBP", symbol: "£",  defaultRate: 0.58,  label: "British Pound",      decimals: 2 },
  { code: "JPY", symbol: "¥",  defaultRate: 112,   label: "Japanese Yen",      decimals: 0 },
  { code: "INR", symbol: "₹",  defaultRate: 61,    label: "Indian Rupee",       decimals: 0 },
  { code: "AUD", symbol: "A$", defaultRate: 1.12,  label: "Australian Dollar",  decimals: 2 },
];

export function getCurrencyMeta(code) {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function fmtMoney(amount, rate, code, opts = {}) {
  const c = getCurrencyMeta(code);
  const r = rate ?? c.defaultRate;
  const v = (amount || 0) * r;
  const minFrac = opts.minDigits ?? c.decimals;
  const maxFrac = opts.maxDigits ?? c.decimals;
  const sign = v < -0.0001 ? "-" : "";
  return `${sign}${c.symbol}${Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  })}`;
}

export function fmtAxis(amount, rate, code) {
  const c = getCurrencyMeta(code);
  const r = rate ?? c.defaultRate;
  const v = (amount || 0) * r;
  const sign = v < -0.0001 ? "-" : "";
  const av = Math.abs(v);
  if (av >= 1000) return `${sign}${c.symbol}${(av / 1000).toFixed(av >= 10000 ? 0 : 1)}k`;
  return `${sign}${c.symbol}${av.toFixed(0)}`;
}