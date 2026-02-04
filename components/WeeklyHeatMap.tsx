import React, { useMemo } from "react";
import { Workout } from "../types";

interface WeeklyHeatMapProps {
  workouts: Workout[];
}

const parseLocalDate = (dateStr?: string) => {
  // Avoid UTC shift bugs from new Date("YYYY-MM-DD")
  if (!dateStr) return new Date(0);
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(y, m - 1, d);
};

const formatDayLabel = (dateStr: string) => {
  const dt = parseLocalDate(dateStr);
  const weekday = dt.toLocaleDateString(undefined, { weekday: "short" });
  const dayMonth = dt.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
  return `${weekday} ${dayMonth}`;
};

const getWorkoutTonnage = (w: Workout) =>
  (w.exercises || []).reduce(
    (acc, ex) => acc + (ex.sets || []).reduce((sAcc, s) => sAcc + (Number(s.reps) * Number(s.weight || 0)), 0),
    0
  );

const getExerciseTonnage = (w: Workout, exerciseName: string) => {
  const ex = (w.exercises || []).find((e) => (e.name || "").trim().toLowerCase() === exerciseName.trim().toLowerCase());
  if (!ex) return 0;
  return (ex.sets || []).reduce((acc, s) => acc + (Number(s.reps) * Number(s.weight || 0)), 0);
};

const WeeklyHeatMap: React.FC<WeeklyHeatMapProps> = ({ workouts }) => {
  const model = useMemo(() => {
    const valid = (workouts || [])
      .filter((w) => w?.date)
      .slice()
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime());

    // Last 5 sessions only (readability)
    const lastFive = valid.slice(0, 5).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

    // Choose exercises to display (top by tonnage across these 5 sessions)
    const totalsByExercise: Record<string, number> = {};
    lastFive.forEach((w) => {
      (w.exercises || []).forEach((ex) => {
        const key = (ex.name || "").trim();
        if (!key) return;
        const tonnage = (ex.sets || []).reduce(
          (acc, s) => acc + (Number(s.reps) * Number(s.weight || 0)),
          0
        );
        totalsByExercise[key] = (totalsByExercise[key] || 0) + tonnage;
      });
    });

    const exerciseRows = Object.entries(totalsByExercise)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) // keep compact
      .map(([name]) => name);

    // For intensity scaling in cells
    const maxCell = Math.max(
      1,
      ...exerciseRows.flatMap((exName) => lastFive.map((w) => getExerciseTonnage(w, exName)))
    );

    return { lastFive, exerciseRows, maxCell };
  }, [workouts]);

  if (model.lastFive.length === 0) {
    return (
      <div className="bg-slate-950/40 rounded-3xl border border-slate-800/50 p-8 text-center text-slate-500">
        Log some sessions to generate your Weekly Performance Matrix.
      </div>
    );
  }

  return (
    <div className="bg-slate-950/40 rounded-3xl border border-slate-800/50 p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Weekly Performance Matrix</h3>
          <p className="text-xs text-slate-500 mt-1">Last 5 sessions • exercises + tonnage for quick readability</p>
        </div>
        <div className="text-xs text-slate-500">
          {model.lastFive.length} sessions
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          {/* Header row */}
          <div className="grid grid-cols-[240px_repeat(5,minmax(88px,1fr))] gap-2 mb-2 px-2">
            <div className="text-[10px] uppercase font-black tracking-widest text-slate-600">Exercise</div>
            {model.lastFive.map((w) => (
              <div key={w.id || w.date} className="text-[10px] uppercase font-black tracking-widest text-slate-600 text-center">
                {formatDayLabel(w.date)}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="space-y-2">
            {model.exerciseRows.map((exName) => (
              <div
                key={exName}
                className="grid grid-cols-[240px_repeat(5,minmax(88px,1fr))] gap-2 items-center bg-slate-900/30 border border-slate-800/40 rounded-2xl px-2 py-2"
              >
                <div className="text-sm font-bold text-slate-200 truncate pr-2" title={exName}>
                  {exName}
                </div>

                {model.lastFive.map((w) => {
                  const v = getExerciseTonnage(w, exName);
                  const ratio = Math.min(1, v / model.maxCell);

                  // color: none -> slate, low -> blue, high -> orange
                  const color =
                    v === 0 ? "bg-slate-800/70" :
                    ratio < 0.35 ? "bg-blue-900" :
                    ratio < 0.7 ? "bg-blue-600" :
                    "bg-orange-500";

                  return (
                    <div key={(w.id || w.date) + exName} className="flex items-center justify-center">
                      <div
                        title={
                          v > 0
                            ? `${exName}\n${w.date}\n${(v / 1000).toFixed(2)}t (${Math.round(v).toLocaleString()}kg)`
                            : `${exName}\n${w.date}\nNot performed`
                        }
                        className={`w-full h-9 rounded-xl border border-slate-800/60 ${v === 0 ? "" : "shadow-[0_0_30px_rgba(59,130,246,0.15)]"} flex items-center justify-center`}
                      >
                        <div className={`h-3.5 rounded-full ${color}`} style={{ width: `${Math.max(10, ratio * 92)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer mini-summary */}
          <div className="mt-5 grid grid-cols-[240px_repeat(5,minmax(88px,1fr))] gap-2 px-2">
            <div className="text-[10px] uppercase font-black tracking-widest text-slate-600">Session tonnage</div>
            {model.lastFive.map((w) => {
              const t = getWorkoutTonnage(w);
              return (
                <div key={(w.id || w.date) + "_ton"} className="text-xs text-slate-400 text-center font-mono">
                  {(t / 1000).toFixed(2)}t
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-slate-600">
        <span>Less</span>
        <div className="flex items-center gap-2">
          <div className
