import React, { useMemo, useState } from 'react';
import { Workout } from '../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsProps {
  workouts: Workout[];
}

const Analytics: React.FC<AnalyticsProps> = ({ workouts }) => {
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  // Get unique exercise names
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    workouts.forEach(w => w.exercises.forEach(ex => names.add(ex.name)));
    return Array.from(names).sort();
  }, [workouts]);

  // Set initial selected exercise if none selected
  useMemo(() => {
    if (!selectedExercise && exerciseNames.length > 0) {
      setSelectedExercise(exerciseNames[0]);
    }
  }, [exerciseNames, selectedExercise]);

  // Data for the global volume over time chart
  const volumeData = useMemo(() => {
    return [...workouts].reverse().map(w => ({
      date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      volume: w.totalVolume
    }));
  }, [workouts]);

  // Data for the specific exercise progress
  const exerciseProgressData = useMemo(() => {
    if (!selectedExercise) return [];
    
    return [...workouts]
      .reverse()
      .filter(w => w.exercises.some(ex => ex.name === selectedExercise))
      .map(w => {
        const exercise = w.exercises.find(ex => ex.name === selectedExercise);
        // Find max weight for this exercise in this workout
        const maxWeight = exercise?.sets.reduce((max, s) => Math.max(max, s.weight), 0) || 0;
        const totalExVolume = exercise?.sets.reduce((sum, s) => sum + (s.weight * s.reps), 0) || 0;
        
        return {
          date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          maxWeight,
          volume: totalExVolume
        };
      });
  }, [workouts, selectedExercise]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl">
          <p className="font-bold mb-1 text-slate-400">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm font-mono" style={{ color: p.color }}>
              {p.name}: {p.value.toLocaleString()} {p.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h1 className="text-3xl font-bold mb-2">Progression Analytics</h1>
        <p className="text-slate-400">Track your strength gains and volume intensity trends.</p>
      </header>

      {/* Global Volume Trend */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8">
        <h2 className="text-xl font-bold mb-6">Total Session Volume (kg)</h2>
        <div className="h-[300px] w-full">
          {workouts.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="volume" name="Total Volume" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Not enough data to display trends.
            </div>
          )}
        </div>
      </section>

      {/* Exercise Specific Progression */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-xl font-bold">Exercise Breakdown</h2>
            <p className="text-sm text-slate-400">Deep dive into specific movement progression.</p>
          </div>
          <select 
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-[200px]"
          >
            {exerciseNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-12">
          {/* Chart 1: Max Weight */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-500">Peak Load (Max Weight)</h3>
              <span className="text-xs text-slate-500">Measures raw strength intensity</span>
            </div>
            <div className="h-[250px] w-full bg-slate-950/30 rounded-2xl p-4 border border-slate-800/50">
              {exerciseProgressData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={exerciseProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      domain={['auto', 'auto']} // Focus on the data range
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="maxWeight" 
                      name="Max Weight" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      unit="kg"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-600 italic">No data available</div>
              )}
            </div>
          </div>

          {/* Chart 2: Exercise Volume */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-amber-500">Accumulated Work (Volume)</h3>
              <span className="text-xs text-slate-500">Measures work capacity and endurance</span>
            </div>
            <div className="h-[250px] w-full bg-slate-950/30 rounded-2xl p-4 border border-slate-800/50">
              {exerciseProgressData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={exerciseProgressData}>
                    <defs>
                      <linearGradient id="colorExVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="volume" 
                      name="Exercise Volume" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      unit="kg"
                      fillOpacity={1} 
                      fill="url(#colorExVol)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-600 italic">No data available</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/50 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">All-Time PR</p>
              <p className="text-3xl font-bold text-emerald-500">
                {exerciseProgressData.length > 0 ? Math.max(...exerciseProgressData.map(d => d.maxWeight)) : 0}kg
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-900">
              <p className="text-xs text-slate-500">Your highest recorded single-set weight.</p>
            </div>
          </div>
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/50 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Total Mass Moved</p>
              <p className="text-3xl font-bold text-amber-500">
                {exerciseProgressData.length > 0 ? Math.round(exerciseProgressData.reduce((acc, d) => acc + d.volume, 0)).toLocaleString() : 0}kg
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-900">
              <p className="text-xs text-slate-500">Lifetime volume accumulated for this exercise.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Analytics;