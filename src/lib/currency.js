// Static, illustrative exchange rates relative to USD (1 USD = rate * currency).
// Not live — for display purposes only. Base data is assumed USD.
export const CURRENCIES = [
  { code: "USD", symbol: "$",   rate: 1,     label: "US Dollar",        decimals: 2 },
  { code: "CAD", symbol: "C$",  rate: 1.36,  label: "Canadian Dollar",  decimals: 2 },
  { code: "EUR", symbol: "€",   rate: 0.92,  label: "Euro",              decimals: 2 },
  { code: "GBP", symbol: "£",   rate: 0.79,  label: "British Pound",     decimals: 2 },
  { code: "JPY", symbol: "¥",   rate: 152.5, label: "Japanese Yen",      decimals: 0 },
  { code: "INR", symbol: "₹",   rate: 83.2,  label: "Indian Rupee",      decimals: 0 },
  { code: "AUD", symbol: "A$",  rate: 1.51,  label: "Australian Dollar", decimals: 2 },
];

export function getCurrency(code) {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export function convertFromUSD(amountUSD, code) {
  return (amountUSD || 0) * getCurrency(code).rate;
}

export function fmtMoney(amountUSD, code, opts = {}) {
  const c = getCurrency(code);
  const v = (amountUSD || 0) * c.rate;
  const minFrac = opts.minDigits ?? c.decimals;
  const maxFrac = opts.maxDigits ?? c.decimals;
  return `${c.symbol}${v.toLocaleString(undefined, {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  })}`;
}

export function fmtAxis(amountUSD, code) {
  const c = getCurrency(code);
  const v = Math.abs((amountUSD || 0) * c.rate);
  if (v >= 1000) return `${c.symbol}${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `${c.symbol}${v.toFixed(0)}`;
}