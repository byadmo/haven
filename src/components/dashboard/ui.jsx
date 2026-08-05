export function Loader({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-2 py-3 text-white/40">
      <div className="h-3 w-3 rounded-full border border-white/30 border-t-emerald-400 animate-spin" />
      <span className="text-[11px] font-mono">{label}</span>
    </div>
  );
}

export function Card3({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-black p-4 ${className}`}>
      {title && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-widest text-white/40">{title}</p>
          {subtitle && <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Bar({ value, max, color = "bg-emerald-500" }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${w}%` }} />
    </div>
  );
}