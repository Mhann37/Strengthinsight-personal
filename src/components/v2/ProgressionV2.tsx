import React, { useMemo, useState, useEffect } from 'react';
import { Workout } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { fromKg, toKg, normalizeUnit, calcWorkoutVolumeKg } from '../../../utils/unit';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { TrophyIcon } from '@heroicons/react/24/solid';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface ProgressionV2Props {
  workouts: Workout[];
}

type ChartMode = 'maxWeight' | 'volume' | 'est1rm';

// Epley formula: weight * (1 + reps/30)
const epley1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

const ProgressionV2: React.FC<ProgressionV2Props> = ({ workouts }) => {
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
    if (!selectedExercise && exerciseNames.length > 0) {
      setSelectedExercise(exerciseNames[0]);
    }
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

  // Per-exercise data with 1RM
  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return [];
    return [...workouts].reverse()
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

        // Best estimated 1RM from this session
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

  // PR celebration: check if most recent session has all-time PR within 14 days
  const prCelebration = useMemo(() => {
    if (exerciseProgressData.length < 2) return null;
    const last = exerciseProgressData[exerciseProgressData.length - 1];
    const allTimeMax = Math.max(...exerciseProgressData.map((d) => d.maxWeight));
    if (last.maxWeight < allTimeMax) return null;
    const daysSince = Math.floor((Date.now() - new Date(last.rawDate).getTime()) / 86_400_000);
    if (daysSince > 14) return null;
    return {
      weight: Math.round(last.maxWeight),
      date: last.date,
    };
  }, [exerciseProgressData]);

  // Consistency score: % of last 8 weeks with exercise trained
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

  const CustomTooltip = ({ active, payload, label }: any) => {
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

  // Chart mode configs
  const chartConfig: Record<ChartMode, { dataKey: string; name: string; color: string; label: string }> = {
    maxWeight: { dataKey: 'maxWeight', name: 'Max Weight', color: '#10b981', label: 'Peak Load (Max Weight)' },
    volume: { dataKey: 'volume', name: 'Volume', color: '#f59e0b', label: 'Accumulated Work (Volume)' },
    est1rm: { dataKey: 'est1rm', name: 'Est. 1RM', color: '#8b5cf6', label: 'Estimated 1RM (Epley)' },
  };

  const cc = chartConfig[chartMode];

  // SVG arc for consistency
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

      {/* Exercise Specific */}
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

        {/* Stats row: PR + Mass Moved + Consistency */}
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
              <text x="48" y="48" textAnchor="middle" dominantBaseline="central" className={`text-lg font-bold ${consistencyColor}`} fill="currentColor" fontSize="18">
                {consistencyScore}%
              </text>
            </svg>
          </div>
        </div>
      </section>

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
                    <tr key={`${row.date}-${idx}`} className="group hover:bg-slate-800/30 transition-colors">
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
