import React, { useMemo } from 'react';
import { Workout } from '../types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { parseWorkoutDate, formatYMD } from '../utils/date';

const Analytics: React.FC<{ workouts: Workout[] }> = ({ workouts }) => {
  const chartData = useMemo(() => {
    const byDay: Record<string, number> = {};

    workouts.forEach((w) => {
      const d = parseWorkoutDate(w.date);
      if (!d) return;

      const key = formatYMD(d);
      byDay[key] = (byDay[key] || 0) + (w.totalVolume || 0);
    });

    return Object.keys(byDay)
      .sort((a, b) => {
        const da = parseWorkoutDate(a)?.getTime() || 0;
        const db = parseWorkoutDate(b)?.getTime() || 0;
        return da - db;
      })
      .map((dateKey) => ({
        date: dateKey,
        volume: Math.round(byDay[dateKey]),
      }));
  }, [workouts]);

  const workoutsSorted = useMemo(() => {
    return [...workouts]
      .map((w) => ({ w, d: parseWorkoutDate(w.date) }))
      .filter(({ d }) => !!d)
      .sort((a, b) => (b.d!.getTime() - a.d!.getTime()))
      .map(({ w }) => w);
  }, [workouts]);

  const totalVolume = workouts.reduce((acc, w) => acc + (w.totalVolume || 0), 0);
  const avgVolume = workouts.length > 0 ? totalVolume / workouts.length : 0;

  const bestSession = workoutsSorted[0];

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h1 className="text-3xl font-bold mb-2">Progression</h1>
        <p className="text-slate-400">Track your training volume and consistency.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Total Volume</p>
          <p className="text-3xl font-mono font-bold text-white">{(totalVolume / 1000).toFixed(1)}t</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Avg Per Session</p>
          <p className="text-3xl font-mono font-bold text-white">{(avgVolume / 1000).toFixed(1)}t</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Sessions Logged</p>
          <p className="text-3xl font-mono font-bold text-white">{workouts.length}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <ChartBarIcon className="w-6 h-6 text-blue-500" />
          Volume Over Time
        </h3>

        {chartData.length === 0 ? (
          <p className="text-slate-500 text-sm">No data yet. Upload a workout to see trends.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} />
                <YAxis />
                <Tooltip labelFormatter={(v) => String(v)} />
                <Line type="monotone" dataKey="volume" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {bestSession && (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-6">
          <p className="text-sm text-slate-300">
            Latest session: <span className="font-bold text-white">{bestSession.date}</span> —{' '}
            <span className="font-bold text-blue-300">{((bestSession.totalVolume || 0) / 1000).toFixed(2)}t</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics;
