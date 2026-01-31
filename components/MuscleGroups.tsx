
import React, { useMemo, useState } from 'react';
import { Workout } from '../types';
import { 
  UserIcon, 
  BoltIcon, 
  ChartBarIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];

const MuscleGroups: React.FC<{ workouts: Workout[] }> = ({ workouts }) => {
  const [timeframe, setTimeframe] = useState<7 | 30 | 90>(30);

  const muscleLoad = useMemo(() => {
    const stats: Record<string, number> = {};
    MUSCLE_GROUPS.forEach(g => stats[g] = 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeframe);

    workouts.filter(w => new Date(w.date) >= cutoff).forEach(w => {
      w.exercises.forEach(ex => {
        const group = ex.muscleGroup || 'Other';
        const volume = ex.sets.reduce((acc, s) => acc + (s.reps * s.weight), 0);
        if (stats[group] !== undefined) stats[group] += volume;
      });
    });
    return stats;
  }, [workouts, timeframe]);

  const maxVolume = Math.max(...Object.values(muscleLoad), 1);

  const getIntensityColor = (group: string) => {
    const volume = muscleLoad[group] || 0;
    const ratio = volume / maxVolume;
    if (volume === 0) return 'fill-slate-800';
    if (ratio < 0.3) return 'fill-blue-900';
    if (ratio < 0.6) return 'fill-blue-600';
    return 'fill-orange-500';
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Overload Dashboard</h1>
          <p className="text-slate-400">Analysis of muscle-specific load distribution.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {[7, 30, 90].map(t => (
            <button key={t} onClick={() => setTimeframe(t as any)}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${timeframe === t ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
              {t}D
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 flex flex-col items-center">
          <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" /> Activation Map
          </h3>
          <svg viewBox="0 0 100 200" className="w-full max-w-[200px]">
            <circle cx="50" cy="20" r="12" className="fill-slate-800" />
            <path d="M25 45 Q50 35 75 45 L75 55 Q50 45 25 55 Z" className={getIntensityColor('Shoulders')} />
            <path d="M30 55 Q50 50 70 55 L70 85 Q50 90 30 85 Z" className={getIntensityColor('Chest')} />
            <rect x="35" y="90" width="30" height="35" rx="4" className={getIntensityColor('Core')} />
            <path d="M20 50 L10 110 L25 50 Z" className={getIntensityColor('Arms')} />
            <path d="M80 50 L90 110 L75 50 Z" className={getIntensityColor('Arms')} />
            <path d="M35 130 L25 195 L48 130 Z" className={getIntensityColor('Legs')} />
            <path d="M65 130 L75 195 L52 130 Z" className={getIntensityColor('Legs')} />
          </svg>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BoltIcon className="w-5 h-5 text-orange-500" /> Volume Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(muscleLoad).map(([group, volume]) => (
                <div key={group} className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{group}</p>
                  <p className="text-xl font-bold text-white">{(volume/1000).toFixed(1)}t</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${(volume/maxVolume)*100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-6 flex gap-4">
            <InformationCircleIcon className="w-6 h-6 text-blue-400 shrink-0" />
            <p className="text-sm text-slate-400">
              Your <strong>{Object.entries(muscleLoad).sort((a,b)=>b[1]-a[1])[0]?.[0]}</strong> are under peak strain. 
              Balanced recruitment is key for structural longevity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MuscleGroups;
