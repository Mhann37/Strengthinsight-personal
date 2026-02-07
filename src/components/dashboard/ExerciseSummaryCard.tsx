import React from "react";

export function ExerciseSummaryCard({
  exerciseName,
  heaviest,
  sessions,
  lastPerformed,
}: {
  exerciseName: string;
  heaviest?: string;
  sessions?: number;
  lastPerformed?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 lg:hidden">
      <div className="text-sm text-slate-400">Exercise Summary</div>
      <div className="text-xl font-bold mt-1">{exerciseName}</div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Heaviest</div>
          <div className="text-lg font-bold mt-1">{heaviest ?? "—"}</div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Sessions</div>
          <div className="text-lg font-bold mt-1">{sessions ?? "—"}</div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Last</div>
          <div className="text-sm font-semibold mt-1 leading-snug">
            {lastPerformed ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
