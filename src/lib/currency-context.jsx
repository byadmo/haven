import React from "react";
import { base44 } from "@/api/base44Client";
import {
  CURRENCIES,
  getCurrencyMeta,
  fmtMoney as _fmtMoney,
  fmtAxis as _fmtAxis,
} from "@/lib/currency";

const CurrencyContext = React.createContext(null);
const CODE_KEY = "dd:currency";
const RATES_KEY = "dd:currency-rates";
const DEFAULT_CODE = "CAD";

export function CurrencyProvider({ children }) {
  const [code, setCodeState] = React.useState(() => {
    try { return localStorage.getItem(CODE_KEY) || DEFAULT_CODE; } catch { return DEFAULT_CODE; }
  });
  const [rates, setRates] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(RATES_KEY) || "{}"); } catch { return {}; }
  });
  const [loading, setLoading] = React.useState(false);

  const meta = getCurrencyMeta(code);
  const rate = rates[code] ?? meta.defaultRate;

  // Live-fetch the CAD→code rate. CAD (the base) never needs fetching.
  async function fetchRate(next) {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `What is the current exchange rate from Canadian Dollars (CAD) to ${next} (${getCurrencyMeta(next).label})? Return only a JSON object with the numeric "rate" = how many ${next} equal 1 CAD. Use the latest available rate.`,
        response_json_schema: { type: "object", properties: { rate: { type: "number" } }, required: ["rate"] },
        add_context_from_internet: true,
        model: "gemini_3_flash",
      });
      const parsed = typeof res === "string" ? JSON.parse(res) : (res?.response || res);
      const r = parsed?.rate;
      if (typeof r === "number" && r > 0) {
        setRates((prev) => {
          const updated = { ...prev, [next]: r };
          try { localStorage.setItem(RATES_KEY, JSON.stringify(updated)); } catch {}
          return updated;
        });
      }
    } catch {}
    setLoading(false);
  }

  function setCode(next) {
    setCodeState(next);
    try { localStorage.setItem(CODE_KEY, next); } catch {}
    if (next !== DEFAULT_CODE) fetchRate(next);
  }

  function refresh() {
    if (code !== DEFAULT_CODE) fetchRate(code);
  }

  const value = {
    code,
    setCode,
    refresh,
    rate,
    loading,
    meta,
    fmtMoney: (a, opts) => _fmtMoney(a, rate, code, opts),
    fmtAxis: (a) => _fmtAxis(a, rate, code),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}