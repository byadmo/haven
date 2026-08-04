import React from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CURRENCIES } from "@/lib/currency";

export default function CurrencySelector({ value, onChange, className }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`w-[92px] h-8 text-xs bg-zinc-950/60 border-zinc-800 text-zinc-200 ${className || ""}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-800">
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.code} <span className="text-zinc-500 ml-1">{c.symbol}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}