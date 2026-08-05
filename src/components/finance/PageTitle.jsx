import React from "react";

/**
 * Consistent page title header used at the top of every Haven page.
 * Title + short subtitle, optional leading icon with neutral styling.
 */
export default function PageTitle({ title, subtitle, icon: Icon }) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="h-9 w-9 grid place-items-center rounded-lg border border-white/10 bg-white/5 shrink-0">
          <Icon className="h-4 w-4 text-emerald-300" strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-base font-semibold tracking-tight text-zinc-50 truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-white/50 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}