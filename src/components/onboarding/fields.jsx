import React from "react";

export const inp =
  "h-9 w-full rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-sm text-zinc-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/30";

export function TextInput({ value, onChange, placeholder, className = "" }) {
  return (
    <input
      className={`${inp} ${className}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function NumberInput({ value, onChange, placeholder, className = "" }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      className={`${inp} ${className}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

export function SelectInput({ value, onChange, options, className = "" }) {
  return (
    <select
      className={`${inp} ${className}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-zinc-950 text-zinc-100">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">{label}</span>
      {children}
    </label>
  );
}