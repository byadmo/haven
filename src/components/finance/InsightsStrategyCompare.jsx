import React, { useEffect, useState } from "react";
import { Snowflake, Flame, TrendingDown, Clock } from "lucide-react";
import { invokeFunc, money } from "@/lib/dashboard";
import { Loader } from "@/components/dashboard/ui";

/**
 * Compact Snowball vs Avalanche comparison for the Insights page.
 * Mirrors the Strategy page's comparison but in a lighter, analytics-friendly card.
 */
export default function InsightsStrategyCompare() {
  const [data, setData] = useState(null);

  useEffect(() => {
    invokeFunc("comparePayoffStrategies", {})
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) return <Loader label="Comparing payoff strategies…" />;

  const recommendedIsAvalanche = data.recommendation === "avalanche";

  return (
    <div className="rounded-lg border border-white/10 bg-black p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-100">Snowball vs Avalanche</h3>
        <span className="text-[10px] uppercase tracking-widest text-emerald-300">
          {data.recommendation} · recommended
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CompareCol
          icon={<Snowflake className="h-3.5 w-3.5 text-sky-300" />}
          label="Snowball"
          months={data.snowball.months_to_payoff}
          interest={data.snowball.total_interest}
          date={data.snowball.debt_free_date}
          highlight={!recommendedIsAvalanche}
        />
        <CompareCol
          icon={<Flame className="h-3.5 w-3.5 text-amber-300" />}
          label="Avalanche"
          months={data.avalanche.months_to_payoff}
          interest={data.avalanche.total_interest}
          date={data.avalanche.debt_free_date}
          highlight={recommendedIsAvalanche}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-white/55 border-t border-white/10 pt-3">
        <span className="flex items-center gap-1.5">
          <TrendingDown className="h-3 w-3 text-emerald-400" />
          Avalanche saves {money(data.interest_saved_by_avalanche)} in interest
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-sky-400" />
          {data.time_saved_by_snowball > 0
            ? `Snowball finishes ${data.time_saved_by_snowball} mo sooner`
            : "Strategies finish in a similar window"}
        </span>
      </div>
    </div>
  );
}

function CompareCol({ icon, label, months, interest, date, highlight }) {
  const yrs = Math.floor(months / 12);
  const rem = months % 12;
  const timeLeft = (yrs ? `${yrs}y ` : "") + (rem ? `${rem}m` : "") || "0m";
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10"}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold text-zinc-100">{label}</span>
        {highlight && <span className="ml-auto text-[9px] text-emerald-300">SELECTED</span>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/40">Time</p>
          <p className="font-mono tabular-nums text-zinc-100">{timeLeft}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-widest text-white/40">Interest</p>
          <p className="font-mono tabular-nums text-rose-300">{money(interest)}</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-white/40 font-mono">Debt-free {date || "—"}</p>
    </div>
  );
}