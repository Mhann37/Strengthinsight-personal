import React from "react";

type Stat = {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
};

export function HeroStatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-3 gap-3 lg:hidden">
      {stats.slice(0, 3).map((s, idx) => (
        <div
          key={idx}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
        >
          <div className="text-xs text-slate-400">{s.label}</div>
          <div className="text-2xl font-bold text-white mt-1 leading-none">
            {s.value}
          </div>
          {s.sub ? (
            <div className="text-xs text-slate-500 mt-1 leading-snug">
              {s.sub}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
