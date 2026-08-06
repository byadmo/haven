export default function CircularRing({ value, size = 120, stroke = 8, color = "#34d399", track = "rgba(255,255,255,0.08)", label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value || 0));
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <div className="absolute text-center">
        <p className="text-base font-semibold font-mono tabular-nums text-zinc-50">{label ?? `${Math.round(pct)}%`}</p>
        {sub && <p className="text-[10px] uppercase tracking-widest text-white/40">{sub}</p>}
      </div>
    </div>
  );
}