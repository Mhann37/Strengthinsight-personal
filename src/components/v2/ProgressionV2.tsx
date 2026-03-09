import React, { useMemo, useState, useEffect } from 'react';
import { Workout } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { fromKg, toKg, normalizeUnit, calcWorkoutVolumeKg } from '../../../utils/unit';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Scatter, ScatterChart,
} from 'recharts';
import { TrophyIcon, LockClosedIcon } from '@heroicons/react/24/solid';
import { ArrowUpTrayIcon, ScaleIcon } from '@heroicons/react/24/outline';

interface ProgressionV2Props {
  workouts: Workout[];
  latestBodyweightKg?: number;
  setView?: (v: string) => void;
}

type ChartMode = 'maxWeight' | 'volume' | 'est1rm';

// ── Epley formula ─────────────────────────────────────────────
const epley1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

// ── Strength benchmarks (ratio = est1RM ÷ bodyweight) ─────────
const STRENGTH_BENCHMARKS: Record<string, { novice: number; developing: number; proficient: number; advanced: number; elite: number }> = {
  'Bench Press (Barbell)':    { novice: 0.5, developing: 0.75, proficient: 1.0, advanced: 1.5, elite: 2.0 },
  'Squat (Barbell)':          { novice: 0.75, developing: 1.0, proficient: 1.25, advanced: 1.75, elite: 2.5 },
  'Deadlift (Barbell)':       { novice: 1.0, developing: 1.25, proficient: 1.5, advanced: 2.0, elite: 2.5 },
  'Overhead Press (Barbell)': { novice: 0.35, developing: 0.5, proficient: 0.65, advanced: 0.9, elite: 1.2 },
  'Barbell Row':               { novice: 0.5, developing: 0.75, proficient: 1.0, advanced: 1.25, elite: 1.5 },
  'Incline Bench Press':      { novice: 0.4, developing: 0.65, proficient: 0.85, advanced: 1.25, elite: 1.6 },
  'Romanian Deadlift':        { novice: 0.75, developing: 1.0, proficient: 1.25, advanced: 1.75, elite: 2.25 },
  'Front Squat':              { novice: 0.6, developing: 0.85, proficient: 1.05, advanced: 1.5, elite: 2.0 },
  'Dumbbell Bench Press':     { novice: 0.35, developing: 0.55, proficient: 0.75, advanced: 1.1, elite: 1.4 },
  'Pull Up':                  { novice: 0.5, developing: 0.75, proficient: 1.0, advanced: 1.5, elite: 2.0 },
};

const findBenchmark = (name: string) => {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(STRENGTH_BENCHMARKS)) {
    if (key.toLowerCase() === lower) return { key, val };
  }
  // Partial match
  for (const [key, val] of Object.entries(STRENGTH_BENCHMARKS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return { key, val };
  }
  return null;
};

const LEVEL_LABELS = ['Novice', 'Developing', 'Proficient', 'Advanced', 'Elite'] as const;

// ── Custom tooltip ────────────────────────────────────────────
const CustomTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl">
      <p className="font-bold mb-1 text-slate-400">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-mono" style={{ color: p.color }}>
          {p.name}: {Number(p.value).toLocaleString()} {p.unit || ''}
        </p>
      ))}
    </div>
  );
};

// ── Lift Records Card (Feature 4) ─────────────────────────────
interface LiftRecord {
  label: string;
  valueKg: number;
  detail: string;
  date: string;
}

const LiftRecordsCard: React.FC<{
  records: LiftRecord[];
  exerciseName: string;
  unit: string;
  est1rmKg: number;
  latestBodyweightKg?: number;
  setView?: (v: string) => void;
}> = ({ records, exerciseName, unit, est1rmKg, latestBodyweightKg, setView }) => {
  const now = Date.now();
  const benchmark = findBenchmark(exerciseName);

  const relStrength = useMemo(() => {
    if (!benchmark || !latestBodyweightKg || !est1rmKg) return null;
    const ratio = est1rmKg / latestBodyweightKg;
    const { val } = benchmark;
    const levels = [val.novice, val.developing, val.proficient, val.advanced, val.elite];

    let levelIdx = 0;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (ratio >= levels[i]) { levelIdx = i; break; }
    }
    // If ratio is below novice, levelIdx = 0 but position < 20%
    const levelMin = levelIdx === 0 ? 0 : levels[levelIdx - 1];
    const levelMax = levels[levelIdx];
    const rangeInLevel = levelMax - levelMin || 1;
    const posInLevel = Math.min(1, Math.max(0, (ratio - levelMin) / rangeInLevel));
    const barPct = Math.min(98, Math.round(((levelIdx + posInLevel) / 5) * 100));

    return { ratio, levelIdx, barPct, levelLabel: LEVEL_LABELS[levelIdx] };
  }, [benchmark, latestBodyweightKg, est1rmKg]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-slate-800/60">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-0.5">Lift Records</p>
        <h3 className="text-base font-bold text-slate-200 truncate">{exerciseName}</h3>
      </div>

      <div className="divide-y divide-slate-800/40">
        {records.map((r) => {
          const isNew = r.date && (now - new Date(r.date).getTime()) < 14 * 86_400_000;
          return (
            <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{r.label}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{r.detail}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-100">
                  {r.valueKg > 0 ? `${Math.round(fromKg(r.valueKg, unit as any) * 10) / 10} ${unit}` : '—'}
                </p>
                {r.date && (
                  <p className="text-[10px] text-slate-500">
                    {new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    {isNew && <span className="ml-1 text-amber-400">🏆</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Relative strength benchmarking */}
      {benchmark && (
        <div className="px-5 py-4 border-t border-slate-800/60">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Relative Strength</p>

          {!latestBodyweightKg ? (
            <button
              onClick={() => setView?.('body')}
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ScaleIcon className="w-4 h-4" />
              Log your bodyweight to unlock relative strength benchmarking →
            </button>
          ) : relStrength ? (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Est. 1RM: {Math.round(fromKg(est1rmKg, unit as any))} {unit}</span>
                <span>BW: {Math.round(fromKg(latestBodyweightKg, unit as any))} {unit}</span>
                <span className="font-bold text-blue-400">{relStrength.ratio.toFixed(2)}×</span>
              </div>
              {/* Progress bar */}
              <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${relStrength.barPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                {LEVEL_LABELS.map((l) => <span key={l}>{l}</span>)}
              </div>
              <p className="text-sm font-bold text-blue-400 mt-2">
                Current level: {relStrength.levelLabel}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

// ── Previous Session + Next Session Guidance (Feature 5) ──────
const SessionGuidanceCard: React.FC<{
  exerciseName: string;
  workouts: Workout[];
  unit: string;
}> = ({ exerciseName, workouts, unit }) => {
  // Get all sessions for this exercise, newest first
  const exSessions = useMemo(() => {
    return workouts
      .filter((w) => w.exercises.some((ex) => ex.name === exerciseName))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .map((w) => {
        const ex = w.exercises.find((e) => e.name === exerciseName)!;
        const sets = ex.sets.map((s: any) => ({
          reps: Number(s.reps) || 0,
          weightKg: toKg(Number(s.weight) || 0, normalizeUnit(s.unit)),
        }));
        // Top set = heaviest, then most reps
        const topSet = sets.reduce((best, s) =>
          s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps) ? s : best,
          sets[0] || { reps: 0, weightKg: 0 }
        );
        const totalVolKg = sets.reduce((sum, s) => sum + s.reps * s.weightKg, 0);
        return { date: w.date, sets, topSet, totalVolKg, recoveryScore: w.recoveryScore, rpe: w.rpe };
      });
  }, [workouts, exerciseName]);

  if (exSessions.length === 0) return null;

  const prev = exSessions[0];
  const daysSince = Math.round((Date.now() - new Date(prev.date).getTime()) / 86_400_000);
  const dayLabel = daysSince === 0 ? 'today' : daysSince === 1 ? 'yesterday' : `${daysSince} days ago`;
  const prevDateLabel = new Date(prev.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  // Guidance logic
  let guidance: { message: string; detail: string; weightKg?: number } | null = null;

  if (exSessions.length >= 2) {
    const [s1, s2, s3] = exSessions;
    const w1 = s1.topSet.weightKg;
    const w2 = s2.topSet.weightKg;
    const r1 = s1.topSet.reps;
    const r2 = s2.topSet.reps;
    const r3 = s3?.topSet.reps;

    const lastRecovery = s1.recoveryScore;
    const progressWouldApply = w1 === w2 && r1 >= r2;
    const recoveryOverride = progressWouldApply && lastRecovery !== undefined && lastRecovery < 50;

    if (recoveryOverride) {
      guidance = {
        message: `Recovery Override`,
        detail: `Your body may need more time — consider holding ${Math.round(fromKg(w1, unit as any))} ${unit} given your recovery score of ${lastRecovery}%.`,
        weightKg: w1,
      };
    } else if (progressWouldApply) {
      const bump = unit === 'lbs' ? 2.26796 : 2.5; // 5lbs or 2.5kg in kg
      guidance = {
        message: `Ready to move up`,
        detail: `You've held ${Math.round(fromKg(w1, unit as any))} ${unit} steady for ${exSessions.length >= 3 && w1 === s3?.topSet.weightKg ? '3' : '2'} sessions — time to increase.`,
        weightKg: w1 + bump,
      };
    } else if (w1 > w2) {
      guidance = {
        message: `Build your reps`,
        detail: `New weight territory at ${Math.round(fromKg(w1, unit as any))} ${unit} — consolidate with more reps before progressing.`,
        weightKg: w1,
      };
    } else if (r3 !== undefined && r1 < r2) {
      guidance = {
        message: `Hold and rebuild`,
        detail: `Reps dipped last session — stay at ${Math.round(fromKg(w1, unit as any))} ${unit} and rebuild consistency.`,
        weightKg: w1,
      };
    } else {
      guidance = {
        message: `Hold and build`,
        detail: `Keep going at ${Math.round(fromKg(w1, unit as any))} ${unit} — aim for more reps this session.`,
        weightKg: w1,
      };
    }
  }

  return (
    <div className="space-y-3">
      {/* Previous session */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">
          Last time · {dayLabel} ({prevDateLabel})
        </p>
        <div className="space-y-1 mb-3">
          {prev.sets.slice(0, 6).map((s, i) => (
            <p key={i} className="text-sm font-mono text-slate-300">
              Set {i + 1}{'   '}
              <span className="font-bold">{Math.round(fromKg(s.weightKg, unit as any))} {unit}</span>
              {' × '}{s.reps}
            </p>
          ))}
          {prev.sets.length > 6 && (
            <p className="text-xs text-slate-600">+{prev.sets.length - 6} more sets</p>
          )}
        </div>
        <div className="pt-2 border-t border-slate-800/50 flex flex-wrap gap-x-4 gap-y-1">
          <p className="text-xs text-slate-500">
            Volume: <span className="text-slate-300">{Math.round(fromKg(prev.totalVolKg, unit as any)).toLocaleString()} {unit}</span>
          </p>
          {prev.recoveryScore !== undefined && (
            <p className="text-xs text-slate-500">
              Recovery: <span className="text-slate-300">{prev.recoveryScore}%</span>
            </p>
          )}
          {prev.rpe !== undefined && (
            <p className="text-xs text-slate-500">
              Felt: <span className="text-slate-300">{prev.rpe}/10</span>
            </p>
          )}
        </div>
      </div>

      {/* Next session guidance */}
      {guidance ? (
        <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-4">
          <p className="text-[10px] uppercase font-bold text-blue-500 tracking-widest mb-1">💡 What to aim for next time</p>
          {guidance.weightKg && (
            <p className="text-base font-bold text-slate-100 mb-1">
              {exerciseName} · {Math.round(fromKg(guidance.weightKg, unit as any) * 10) / 10} {unit}
            </p>
          )}
          <p className="text-sm font-bold text-blue-300">{guidance.message}</p>
          <p className="text-xs text-slate-400 mt-1">{guidance.detail}</p>
          <p className="text-[10px] text-slate-600 mt-3 italic">
            Guidance is based on progressive overload principles — always adjust based on how you feel.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">💡 Next session guidance</p>
          <p className="text-sm text-slate-500">Log 2+ sessions to unlock next session guidance.</p>
        </div>
      )}
    </div>
  );
};

// ── Recovery Correlation (Feature 10) ─────────────────────────
const RecoveryCorrelation: React.FC<{
  workouts: Workout[];
  exerciseName: string;
  unit: string;
}> = ({ workouts, exerciseName, unit }) => {
  const scoredSessions = useMemo(() => {
    return workouts
      .filter((w) => w.recoveryScore !== undefined && w.exercises.some((ex) => ex.name === exerciseName))
      .map((w) => {
        const ex = w.exercises.find((e) => e.name === exerciseName)!;
        const topWeightKg = ex.sets.reduce((max, s: any) => {
          return Math.max(max, toKg(Number(s.weight) || 0, normalizeUnit(s.unit)));
        }, 0);
        return {
          recovery: w.recoveryScore!,
          topWeight: Math.round(fromKg(topWeightKg, unit as any) * 10) / 10,
          date: w.date,
        };
      })
      .filter((s) => s.topWeight > 0)
      .sort((a, b) => a.recovery - b.recovery);
  }, [workouts, exerciseName, unit]);

  const MIN_FOR_UNLOCK = 5;
  const MIN_FOR_TRENDLINE = 8;
  const needed = Math.max(0, MIN_FOR_UNLOCK - scoredSessions.length);

  if (scoredSessions.length < MIN_FOR_UNLOCK) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <LockClosedIcon className="w-5 h-5 text-slate-500" />
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Recovery Correlation</p>
        </div>
        <p className="text-sm text-slate-400 mb-2">See how your recovery score affects your lifting.</p>
        <p className="text-sm text-slate-500">
          Need <span className="text-slate-300 font-bold">{needed}</span> more {needed === 1 ? 'session' : 'sessions'} with recovery data to unlock.
        </p>
        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
          How to log recovery: enter your WHOOP % on the session context screen after each upload.
        </p>
      </div>
    );
  }

  // Linear trend line
  let trendData: { recovery: number; trend: number }[] | null = null;
  if (scoredSessions.length >= MIN_FOR_TRENDLINE) {
    const n = scoredSessions.length;
    const sumX = scoredSessions.reduce((s, d) => s + d.recovery, 0);
    const sumY = scoredSessions.reduce((s, d) => s + d.topWeight, 0);
    const sumXY = scoredSessions.reduce((s, d) => s + d.recovery * d.topWeight, 0);
    const sumX2 = scoredSessions.reduce((s, d) => s + d.recovery * d.recovery, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom !== 0) {
      const slope = (n * sumXY - sumX * sumY) / denom;
      const intercept = (sumY - slope * sumX) / n;
      const minR = Math.min(...scoredSessions.map((d) => d.recovery));
      const maxR = Math.max(...scoredSessions.map((d) => d.recovery));
      trendData = [
        { recovery: minR, trend: slope * minR + intercept },
        { recovery: maxR, trend: slope * maxR + intercept },
      ];

      const insight =
        slope > 0
          ? `📈 Your ${exerciseName} tends to be stronger on higher recovery days. Consider prioritising heavy sessions when your recovery is green.`
          : `📊 No strong recovery-performance pattern detected yet. Keep logging for more accurate insights over time.`;

      return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Recovery Correlation</p>
          <h3 className="text-base font-bold mb-4">Recovery % vs. Top Set Weight</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="recovery"
                  type="number"
                  domain={[0, 100]}
                  name="Recovery %"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  label={{ value: 'Recovery %', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 10 }}
                />
                <YAxis
                  dataKey="topWeight"
                  type="number"
                  name={`Top Set (${unit})`}
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
                        <p>Recovery: {payload[0]?.payload?.recovery}%</p>
                        <p>Top set: {payload[0]?.payload?.topWeight} {unit}</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={scoredSessions}
                  fill="#3b82f6"
                  opacity={0.8}
                  name="Sessions"
                />
                {trendData && (
                  <Line
                    data={trendData}
                    dataKey="trend"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="6 3"
                    name="Trend"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">{insight}</p>
        </div>
      );
    }
  }

  // Enough data but not enough for trend line
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Recovery Correlation</p>
      <h3 className="text-base font-bold mb-4">Recovery % vs. Top Set Weight</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="recovery"
              type="number"
              domain={[0, 100]}
              name="Recovery %"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
            />
            <YAxis
              dataKey="topWeight"
              type="number"
              name={`Top Set (${unit})`}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
                    <p>Recovery: {payload[0]?.payload?.recovery}%</p>
                    <p>Top set: {payload[0]?.payload?.topWeight} {unit}</p>
                  </div>
                );
              }}
            />
            <Scatter data={scoredSessions} fill="#3b82f6" opacity={0.8} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        {MIN_FOR_TRENDLINE - scoredSessions.length} more sessions needed to show trend line.
      </p>
    </div>
  );
};

// ── Main ProgressionV2 ────────────────────────────────────────
const ProgressionV2: React.FC<ProgressionV2Props> = ({ workouts, latestBodyweightKg, setView }) => {
  const { settings } = useUserSettings();
  const unit = settings.unit;
  const [selectedExercise, setSelectedExercise] = useState('');
  const [chartMode, setChartMode] = useState<ChartMode>('maxWeight');

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    workouts.forEach((w) => w.exercises.forEach((ex) => names.add(ex.name)));
    return Array.from(names).sort();
  }, [workouts]);

  useEffect(() => {
    if (!selectedExercise && exerciseNames.length > 0) setSelectedExercise(exerciseNames[0]);
  }, [exerciseNames, selectedExercise]);

  // Global volume trend
  const volumeData = useMemo(() => {
    return [...workouts].reverse().map((w) => {
      const volKg = typeof w.totalVolume === 'number' ? w.totalVolume : calcWorkoutVolumeKg(w);
      return {
        date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        volume: fromKg(volKg, unit),
      };
    });
  }, [workouts, unit]);

  // Per-exercise chart data
  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return [];
    return [...workouts]
      .reverse()
      .filter((w) => w.exercises.some((ex) => ex.name === selectedExercise))
      .map((w) => {
        const exercise = w.exercises.find((ex) => ex.name === selectedExercise);
        const maxWeightKg = exercise?.sets.reduce((max, s: any) => {
          return Math.max(max, toKg(Number(s?.weight) || 0, normalizeUnit(s?.unit)));
        }, 0) || 0;

        const totalExVolKg = exercise?.sets.reduce((sum, s: any) => {
          const reps = Number(s?.reps) || 0;
          const wKg = toKg(Number(s?.weight) || 0, normalizeUnit(s?.unit));
          return sum + wKg * reps;
        }, 0) || 0;

        const est1rmKg = exercise?.sets.reduce((best, s: any) => {
          const reps = Number(s?.reps) || 0;
          const wKg = toKg(Number(s?.weight) || 0, normalizeUnit(s?.unit));
          return Math.max(best, epley1RM(wKg, reps));
        }, 0) || 0;

        return {
          date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          rawDate: w.date,
          maxWeight: fromKg(maxWeightKg, unit),
          volume: fromKg(totalExVolKg, unit),
          est1rm: fromKg(est1rmKg, unit),
        };
      });
  }, [workouts, selectedExercise, unit]);

  // PR celebration
  const prCelebration = useMemo(() => {
    if (exerciseProgressData.length < 2) return null;
    const last = exerciseProgressData[exerciseProgressData.length - 1];
    const allTimeMax = Math.max(...exerciseProgressData.map((d) => d.maxWeight));
    if (last.maxWeight < allTimeMax) return null;
    const daysSince = Math.floor((Date.now() - new Date(last.rawDate).getTime()) / 86_400_000);
    if (daysSince > 14) return null;
    return { weight: Math.round(last.maxWeight), date: last.date };
  }, [exerciseProgressData]);

  // Consistency score
  const consistencyScore = useMemo(() => {
    if (!selectedExercise) return 0;
    const now = new Date();
    const weeks = new Set<number>();
    for (const w of workouts) {
      if (!w.exercises.some((ex) => ex.name === selectedExercise)) continue;
      const d = new Date(w.date);
      const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 86_400_000));
      if (weeksAgo >= 0 && weeksAgo < 8) weeks.add(weeksAgo);
    }
    return Math.round((weeks.size / 8) * 100);
  }, [workouts, selectedExercise]);

  const consistencyColor = consistencyScore >= 75 ? 'text-emerald-400' : consistencyScore >= 50 ? 'text-amber-400' : 'text-red-400';
  const consistencyStroke = consistencyScore >= 75 ? '#34d399' : consistencyScore >= 50 ? '#fbbf24' : '#f87171';

  // Exercise history log
  const exerciseHistoryData = useMemo(() => {
    if (!selectedExercise) return [];
    return workouts
      .filter((w) => w.exercises.some((ex) => ex.name === selectedExercise))
      .map((w) => {
        const exercise = w.exercises.find((ex) => ex.name === selectedExercise)!;
        const sets = exercise.sets;
        const totalReps = sets.reduce((sum, s) => sum + (Number((s as any).reps) || 0), 0);
        const maxWeightKg = sets.reduce((max, s) => Math.max(max, toKg(Number((s as any).weight) || 0, normalizeUnit((s as any).unit))), 0);
        const formattedSets = sets.map((s) => {
          const reps = Number((s as any).reps) || 0;
          const displayWeight = Math.round(fromKg(toKg(Number((s as any).weight) || 0, normalizeUnit((s as any).unit)), unit));
          return `Set ${(s as any).setNumber ?? sets.indexOf(s) + 1}: ${reps} × ${displayWeight} ${unit}`;
        });
        return {
          date: w.date,
          displayDate: new Date(w.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
          setCount: sets.length,
          totalReps,
          maxWeight: Math.round(fromKg(maxWeightKg, unit) * 10) / 10,
          formattedSets,
          // Context line (Feature 3)
          recoveryScore: w.recoveryScore,
          rpe: w.rpe,
          notes: w.notes,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, selectedExercise, unit]);

  const allTimePr = useMemo(() => {
    if (exerciseProgressData.length === 0) return 0;
    return Math.max(...exerciseProgressData.map((d) => d.maxWeight));
  }, [exerciseProgressData]);

  const totalMassMoved = useMemo(() => {
    if (exerciseProgressData.length === 0) return 0;
    return Math.round(exerciseProgressData.reduce((acc, d) => acc + d.volume, 0));
  }, [exerciseProgressData]);

  // Lift records (Feature 4) — computed in kg then displayed
  const liftRecords = useMemo((): LiftRecord[] => {
    if (!selectedExercise || exerciseProgressData.length === 0) return [];

    // Peak load
    let peakLoadKg = 0; let peakLoadDate = '';
    // Est 1RM
    let peak1rmKg = 0; let peak1rmDate = ''; let peak1rmDetail = '';
    // Top set output
    let topSetOutputKg = 0; let topSetDate = ''; let topSetDetail = '';
    // Best session total
    let bestSessionKg = 0; let bestSessionDate = '';

    for (const w of workouts) {
      const ex = w.exercises.find((e) => e.name === selectedExercise);
      if (!ex) continue;
      let sessionVolKg = 0;

      for (const s of ex.sets as any[]) {
        const reps = Number(s.reps) || 0;
        const wKg = toKg(Number(s.weight) || 0, normalizeUnit(s.unit));

        if (wKg > peakLoadKg) { peakLoadKg = wKg; peakLoadDate = w.date; }

        const e1rm = epley1RM(wKg, reps);
        if (e1rm > peak1rmKg) {
          peak1rmKg = e1rm;
          peak1rmDate = w.date;
          peak1rmDetail = `${Math.round(fromKg(wKg, unit))} ${unit} × ${reps} reps`;
        }

        const setOutput = wKg * reps;
        if (setOutput > topSetOutputKg) {
          topSetOutputKg = setOutput;
          topSetDate = w.date;
          topSetDetail = `${Math.round(fromKg(wKg, unit))} ${unit} × ${reps} reps`;
        }

        sessionVolKg += wKg * reps;
      }

      if (sessionVolKg > bestSessionKg) { bestSessionKg = sessionVolKg; bestSessionDate = w.date; }
    }

    return [
      { label: 'Peak Load', valueKg: peakLoadKg, detail: 'Heaviest single set weight', date: peakLoadDate },
      { label: 'Est. Max Strength (1RM)', valueKg: peak1rmKg, detail: peak1rmDetail || 'Epley formula', date: peak1rmDate },
      { label: 'Top Set Output', valueKg: topSetOutputKg, detail: topSetDetail || 'weight × reps', date: topSetDate },
      { label: 'Best Session Total', valueKg: bestSessionKg, detail: 'Sum of all set volumes', date: bestSessionDate },
    ];
  }, [workouts, selectedExercise, unit, exerciseProgressData]);

  const chartConfig: Record<ChartMode, { dataKey: string; name: string; color: string }> = {
    maxWeight: { dataKey: 'maxWeight', name: 'Max Weight', color: '#10b981' },
    volume:    { dataKey: 'volume',    name: 'Volume',     color: '#f59e0b' },
    est1rm:    { dataKey: 'est1rm',    name: 'Est. 1RM',   color: '#8b5cf6' },
  };
  const cc = chartConfig[chartMode];

  const arcRadius = 40;
  const arcCircumference = 2 * Math.PI * arcRadius;
  const arcOffset = arcCircumference - (consistencyScore / 100) * arcCircumference;

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h1 className="text-3xl font-bold mb-2">Progression Analytics</h1>
        <p className="text-slate-400">Track your strength gains and volume intensity trends.</p>
      </header>

      {/* Global Volume Trend */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Global Trend</p>
          <h2 className="text-lg font-bold">Total Session Volume ({unit})</h2>
        </div>
        <div className="h-[300px] w-full">
          {workouts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorVolV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="volume" name="Total Volume" stroke="#3b82f6" strokeWidth={3} unit={unit} fillOpacity={1} fill="url(#colorVolV2)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <ArrowUpTrayIcon className="w-10 h-10 text-slate-700 mb-3" />
              <p className="font-medium">Not enough data to display trends.</p>
              <p className="text-xs text-slate-600 mt-1">Upload workouts to see your volume over time.</p>
            </div>
          )}
        </div>
      </section>

      {/* Exercise-specific section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Exercise Breakdown</p>
            <h2 className="text-lg font-bold">Exercise Progression</h2>
          </div>
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            {exerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>

        {/* PR Celebration */}
        {prCelebration && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-600/5 flex items-center gap-3">
            <TrophyIcon className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-300">New PR — {selectedExercise}</p>
              <p className="text-sm text-amber-400/80">{prCelebration.weight} {unit} on {prCelebration.date}</p>
            </div>
          </div>
        )}

        {/* Feature 4: Lift Records */}
        {selectedExercise && liftRecords.length > 0 && (
          <div className="mb-6">
            <LiftRecordsCard
              records={liftRecords}
              exerciseName={selectedExercise}
              unit={unit}
              est1rmKg={liftRecords[1]?.valueKg || 0}
              latestBodyweightKg={latestBodyweightKg}
              setView={setView}
            />
          </div>
        )}

        {/* Feature 5: Previous session + guidance */}
        {selectedExercise && (
          <div className="mb-6">
            <SessionGuidanceCard
              exerciseName={selectedExercise}
              workouts={workouts}
              unit={unit}
            />
          </div>
        )}

        {/* Chart mode toggle */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-fit mb-6">
          {(['maxWeight', 'volume', 'est1rm'] as ChartMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setChartMode(mode)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                chartMode === mode ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {chartConfig[mode].name}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="h-[280px] w-full bg-slate-950/30 rounded-2xl p-4 border border-slate-800/50">
          {exerciseProgressData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'volume' ? (
                <AreaChart data={exerciseProgressData}>
                  <defs>
                    <linearGradient id="colorExV2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cc.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={cc.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey={cc.dataKey} name={cc.name} stroke={cc.color} strokeWidth={2} unit={unit} fillOpacity={1} fill="url(#colorExV2)" />
                </AreaChart>
              ) : (
                <LineChart data={exerciseProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey={cc.dataKey} name={cc.name} stroke={cc.color} strokeWidth={3} unit={unit} dot={{ fill: cc.color, strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <p className="font-medium">No data available</p>
              <p className="text-xs mt-1">Select an exercise above to view its progression.</p>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/50">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">All-Time PR</p>
            <p className="text-3xl font-bold text-emerald-500">{Math.round(allTimePr)}{unit}</p>
            <p className="text-xs text-slate-500 mt-2">Highest recorded single-set weight.</p>
          </div>
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/50">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Total Mass Moved</p>
            <p className="text-3xl font-bold text-amber-500">{totalMassMoved.toLocaleString()}{unit}</p>
            <p className="text-xs text-slate-500 mt-2">Lifetime volume for this exercise.</p>
          </div>
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/50 flex flex-col items-center justify-center">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Consistency (8wk)</p>
            <svg width="96" height="96" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r={arcRadius} fill="none" stroke="#1e293b" strokeWidth="6" />
              <circle
                cx="48" cy="48" r={arcRadius} fill="none" stroke={consistencyStroke} strokeWidth="6"
                strokeDasharray={arcCircumference} strokeDashoffset={arcOffset}
                strokeLinecap="round" transform="rotate(-90 48 48)"
                className="transition-all duration-700"
              />
              <text x="48" y="48" textAnchor="middle" dominantBaseline="central" fill={consistencyStroke} fontSize="18" fontWeight="bold">
                {consistencyScore}%
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* Feature 10: Recovery Correlation */}
      {selectedExercise && (
        <RecoveryCorrelation workouts={workouts} exerciseName={selectedExercise} unit={unit} />
      )}

      {/* Exercise History Log */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500">History</p>
          <h2 className="text-lg font-bold">Exercise History</h2>
          <p className="text-sm text-slate-400 mt-1">
            Every logged session for <span className="text-white font-medium">{selectedExercise || '—'}</span>, newest first.
          </p>
        </div>

        {exerciseHistoryData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <ArrowUpTrayIcon className="w-8 h-8 text-slate-700 mb-2" />
            <p className="font-medium">{selectedExercise ? 'No logged sessions found.' : 'Select an exercise above.'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-800">
                    <th className="pb-3 pr-6 text-[10px] uppercase tracking-widest font-bold text-slate-500">Date</th>
                    <th className="pb-3 pr-6 text-[10px] uppercase tracking-widest font-bold text-slate-500">Sets</th>
                    <th className="pb-3 pr-6 text-[10px] uppercase tracking-widest font-bold text-slate-500">Total Reps</th>
                    <th className="pb-3 pr-6 text-[10px] uppercase tracking-widest font-bold text-slate-500">Max Weight</th>
                    <th className="pb-3 text-[10px] uppercase tracking-widest font-bold text-slate-500">Set Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {exerciseHistoryData.map((row, idx) => (
                    <React.Fragment key={`${row.date}-${idx}`}>
                      <tr className="group hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 pr-6 font-mono text-slate-300 whitespace-nowrap">{row.displayDate}</td>
                        <td className="py-4 pr-6 text-slate-300">{row.setCount}</td>
                        <td className="py-4 pr-6 text-slate-300">{row.totalReps}</td>
                        <td className="py-4 pr-6 font-semibold text-emerald-400 whitespace-nowrap">{row.maxWeight} {unit}</td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {row.formattedSets.map((s, si) => <span key={si} className="font-mono text-xs text-slate-400">{s}</span>)}
                          </div>
                        </td>
                      </tr>
                      {/* Context line (Feature 3) */}
                      {(row.recoveryScore !== undefined || row.rpe !== undefined || row.notes) && (
                        <tr>
                          <td colSpan={5} className="pb-3 pt-0">
                            <p className="text-xs text-slate-500 italic pl-0">
                              {row.recoveryScore !== undefined && `Recovery: ${row.recoveryScore}%`}
                              {row.recoveryScore !== undefined && (row.rpe !== undefined || row.notes) && '  ·  '}
                              {row.rpe !== undefined && `Effort: ${row.rpe}/10`}
                              {row.rpe !== undefined && row.notes && '  ·  '}
                              {row.notes && `"${row.notes}"`}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
              {exerciseHistoryData.map((row, idx) => (
                <div key={`${row.date}-${idx}`} className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-slate-300">{row.displayDate}</span>
                    <span className="text-emerald-400 font-semibold text-sm">{row.maxWeight} {unit} max</span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>{row.setCount} sets</span>
                    <span>{row.totalReps} reps</span>
                  </div>
                  {/* Context line */}
                  {(row.recoveryScore !== undefined || row.rpe !== undefined || row.notes) && (
                    <p className="text-xs text-slate-500 italic">
                      {row.recoveryScore !== undefined && `Recovery: ${row.recoveryScore}%`}
                      {row.recoveryScore !== undefined && (row.rpe !== undefined || row.notes) && ' · '}
                      {row.rpe !== undefined && `Effort: ${row.rpe}/10`}
                      {row.rpe !== undefined && row.notes && ' · '}
                      {row.notes && `"${row.notes}"`}
                    </p>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex flex-col gap-1">
                    {row.formattedSets.map((s, si) => <span key={si} className="font-mono text-xs text-slate-500">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default ProgressionV2;
