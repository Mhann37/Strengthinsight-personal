import React, { useMemo, useState } from 'react';
import { Workout, Exercise } from '../types';
import {
  UserIcon,
  BoltIcon,
  ChartBarIcon,
  InformationCircleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { parseWorkoutDate, formatYMD } from '../utils/date';

// Include Other because our fallback categorizer can return it.
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other'];

/**
 * Smart Fallback Categorizer for legacy or missing data
 */
const getMuscleGroup = (ex: Exercise): string => {
  if (ex.muscleGroup && MUSCLE_GROUPS.includes(ex.muscleGroup)) return ex.muscleGroup;

  const name = (ex.name || '').toLowerCase();

  if (name.includes('bench') || name.includes('chest') || name.includes('fly') || name.includes('pushup')) return 'Chest';
  if (name.includes('row') || name.includes('pull') || name.includes('lat') || name.includes('chin')) return 'Back';

  if (name.includes('shoulder') || name.includes('lateral') || name.includes('deltoid')) return 'Shoulders';
  if (name.includes('press')) return 'Shoulders';

  if (name.includes('curl') || name.includes('tricep') || name.includes('bicep') || name.includes('extension') || name.includes('dip')) return 'Arms';

  if (name.includes('squat') || name.includes('leg') || name.includes('lung') || name.includes('calf') || name.includes('deadlift')) return 'Legs';

  if (name.includes('plank') || name.includes('crunch') || name.includes('abs') || name.includes('core')) return 'Core';

  return 'Other';
};

const startOfWeek = (d: Date) => {
  // Monday start
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatWeekLabel = (d: Date) => {
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
};

const MuscleGroups: React.FC<{ workouts: Workout[] }> = ({ workouts }) => {
  const [timeframe, setTimeframe] = useState<7 | 30 | 90>(30);
  const [selectedGroup, setSelectedGroup] = useState<string>('Chest');

  const stats = useMemo(() => {
    const load: Record<string, number> = {};
    const peaks: Record<string, { name: string; volume: number }> = {};

    MUSCLE_GROUPS.forEach((g) => {
      load[g] = 0;
      peaks[g] = { name: 'None', volume: 0 };
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframe);
    cutoff.setHours(0, 0, 0, 0);

    // weekly[weekKey][group] = volume
    const weekly: Record<string, Record<string, number>> = {};
    const weekKeyToDate: Record<string, Date> = {};

    workouts
      .map((w) => ({ w, d: parseWorkoutDate((w as any).date) }))
      .filter(({ d }) => d && d.getTime() >= cutoff.getTime())
      .forEach(({ w, d }) => {
        const weekStart = startOfWeek(d!);
        const weekKey = formatYMD(weekStart); // ✅ local week key

        weekKeyToDate[weekKey] = weekStart;

        if (!weekly[weekKey]) {
          weekly[weekKey] = {};
          MUSCLE_GROUPS.forEach((g) => (weekly[weekKey][g] = 0));
        }

        (w.exercises || []).forEach((ex: Exercise) => {
          const group = getMuscleGroup(ex);
          const volume =
            (ex.sets || []).reduce(
              (acc: number, s: any) => acc + (Number(s.reps) || 0) * (Number(s.weight) || 0),
              0
            ) || 0;

          load[group] = (load[group] || 0) + volume;

          if (group !== 'Other' && volume > (peaks[group]?.volume || 0)) {
            peaks[group] = { name: ex.name || 'Unknown', volume };
          }

          weekly[weekKey][group] += volume;
        });
      });

    const weeklySeries = Object.keys(weekly)
      .sort((a, b) => (weekKeyToDate[a]?.getTime() || 0) - (weekKeyToDate[b]?.getTime() || 0))
      .map((weekKey) => {
        const weekStart = weekKeyToDate[weekKey] || parseWorkoutDate(weekKey) || new Date();
        const label = formatWeekLabel(weekStart);
        return { weekKey, label, ...weekly[weekKey] };
      });

    return { load, peaks, weeklySeries };
  }, [workouts, timeframe]);

  const maxVolume = Math.max(...(Object.values(stats.load) as number[]), 1);

  const getIntensityColor = (group: string) => {
    const volume = stats.load[group] || 0;
    const ratio = volume / maxVolume;
    if (volume === 0) return 'fill-slate-800';
    if (ratio < 0.3) return 'fill-blue-900';
    if (ratio < 0.6) return 'fill-blue-600';
    return 'fill-orange-500';
  };

  const topMuscle = (Object.entries(stats.load) as [string, number][])
    .filter(([g]) => g !== 'Other')
    .sort((a, b) => b[1] - a[1])[0];

  const lowLoadMuscle = MUSCLE_GROUPS.filter((g) => g !== 'Other').find((g) => (stats.load[g] || 0) < maxVolume * 0.2);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Overload Analysis</h1>
          <p className="text-slate-400">Muscle activation patterns from the last {timeframe} days.</p>
        </div>
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 w-fit">
          {[7, 30, 90].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t as any)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                timeframe === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t} Days
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Anatomical Heatmap */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center">
          <h3 className="text-lg font-bold mb-10 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" /> Kinetic Map
          </h3>
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <svg viewBox="0 0 100 200" className="w-full max-w-[220px] relative z-10 transition-transform duration-500 hover:scale-105">
              <circle cx="50" cy="20" r="14" className="fill-slate-800" />
              <path d="M25 45 Q50 35 75 45 L75 55 Q50 45 25 55 Z" className={`${getIntensityColor('Shoulders')} transition-colors duration-700`} />
              <path d="M30 55 Q50 50 70 55 L70 85 Q50 90 30 85 Z" className={`${getIntensityColor('Chest')} transition-colors duration-700`} />
              <rect x="35" y="90" width="30" height="40" rx="4" className={`${getIntensityColor('Core')} transition-colors duration-700`} />
              <path d="M20 50 L8 120 L22 55 Z" className={`${getIntensityColor('Arms')} transition-colors duration-700`} />
              <path d="M80 50 L92 120 L78 55 Z" className={`${getIntensityColor('Arms')} transition-colors duration-700`} />
              <path d="M35 135 L22 195 L48 135 Z" className={`${getIntensityColor('Legs')} transition-colors duration-700`} />
              <path d="M65 135 L78 195 L52 135 Z" className={`${getIntensityColor('Legs')} transition-colors duration-700`} />
            </svg>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
              <div className="w-2 h-2 rounded-full bg-slate-800"></div> Recovery
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
              <div className="w-2 h-2 rounded-full bg-blue-600"></div> Low Load
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div> Overload
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {/* Muscle Progression */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 lg:p-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold flex items-center gap-3">
                <ChartBarIcon className="w-6 h-6 text-blue-500" /> Muscle Progression
              </h3>

              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-blue-400 outline-none focus:border-blue-500"
              >
                {MUSCLE_GROUPS.filter((g) => g !== 'Other').map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {stats.weeklySeries.length === 0 ? (
              <p className="text-slate-500 text-sm">No workouts found in the selected timeframe.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.weeklySeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey={selectedGroup} strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="text-slate-500 text-xs mt-4">Weekly tonnage (reps × weight). Switch muscle group to view trends.</p>
          </div>

          {/* Tonnage Capacity */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 lg:p-10">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <BoltIcon className="w-6 h-6 text-orange-500" /> Tonnage Capacity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {MUSCLE_GROUPS.filter((g) => g !== 'Other').map((group) => {
                const volume = stats.load[group] || 0;
                const peak = stats.peaks[group] || { name: 'None', volume: 0 };

                return (
                  <div key={group} className="bg-slate-950/50 p-6 rounded-[2rem] border border-slate-800/50 transition-all hover:border-blue-500/30">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">{group}</p>
                        <p className="text-3xl font-mono font-bold text-white">
                          {(volume / 1000).toFixed(2)}
                          <span className="text-sm opacity-50 ml-1">t</span>
                        </p>
                      </div>
                      <div className="bg-blue-600/10 p-2 rounded-xl">
                        <ChartBarIcon className="w-5 h-5 text-blue-500" />
                      </div>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-1000"
                        style={{ width: `${(volume / maxVolume) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <TrophyIcon className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-medium truncate">
                        Lead: <span className="text-slate-200">{peak.name}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-8 flex gap-6 items-start">
            <InformationCircleIcon className="w-8 h-8 text-blue-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-blue-400 mb-2">Longitudinal Insight</h4>
              <p className="text-slate-400 leading-relaxed">
                Based on your {timeframe}-day volume, your <strong>{topMuscle?.[0] || 'top muscle group'}</strong> are currently taking the
                highest load. If you're feeling fatigue, consider prioritizing a "Deload Week" or switching focus to
                <strong> {lowLoadMuscle || 'your supporting groups'}</strong> to maintain structural balance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuscleGroups;
