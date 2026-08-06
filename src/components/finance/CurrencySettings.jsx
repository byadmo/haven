import React from "react";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES } from "@/lib/currency";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export default function CurrencySettings() {
  const { code, setCode, rate, loading, refresh } = useCurrency();

  return (
    <div className="rounded-lg border border-white/10 bg-black p-5">
      <h2 className="text-xs uppercase tracking-widest text-white/50">Display Currency</h2>
      <p className="text-lg font-semibold font-mono tracking-tight text-zinc-100 mt-1">Currency</p>
      <p className="text-xs text-white/40 mt-1 mb-4">
        Show balances across the app in this currency. CAD is the default and used as-is; selecting another currency fetches the live CAD exchange rate once.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Select value={code} onValueChange={setCode}>
          <SelectTrigger className="w-full sm:w-[260px] h-10 bg-zinc-950 border-white/10 text-zinc-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.code} <span className="text-zinc-500 ml-1">{c.symbol}</span> · {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {code !== "CAD" && (
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="border-white/10 text-zinc-300 hover:bg-white/5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh rate
          </Button>
        )}
      </div>

      <p className="text-[11px] text-white/40 mt-3 tabular-nums">
        1 CAD = {rate.toFixed(4)} {code}
        {loading && <span className="ml-2 text-emerald-300">updating…</span>}
        {code === "CAD" && <span className="ml-2 text-white/30">· default (no conversion)</span>}
      </p>
    </div>
  );
}