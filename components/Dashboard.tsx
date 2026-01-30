
import React from 'react';
import { Workout } from '../types';
import WeeklyHeatMap from './WeeklyHeatMap';
import InsightsPanel from './InsightsPanel';
import { FireIcon, BoltIcon, TrophyIcon } from '@heroicons/react/24/solid';

interface DashboardProps {
  workouts: Workout[];
}

const Dashboard: React.FC<DashboardProps> = ({ workouts }) => {
  const totalVolume = workouts.reduce((acc, w) => acc + (w.totalVolume || 0), 0);
  const totalWorkouts = workouts.length;
  const recentWorkout = workouts[0];

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-3xl font-bold mb-2">Welcome back, Athlete</h1>
        <p className="text-slate-400">Here's your strength progression at a glance.</p>
      </header>

      {/* Weekly Heatmap Section - Moved to Top */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold">Weekly Performance Matrix</h2>
            <p className="text-sm text-slate-400">Visualize your exercise distribution across the last 5 days.</p>
          </div>
        </div>
        <WeeklyHeatMap workouts={workouts} />
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
              <FireIcon className="w-7 h-7 text-orange-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Activity</span>
          </div>
          <p className="text-3xl font-bold">{totalWorkouts}</p>
          <p className="text-slate-400 text-sm mt-1">Total Workouts Logged</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
              <BoltIcon className="w-7 h-7 text-blue-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Volume</span>
          </div>
          <p className="text-3xl font-bold">{(totalVolume / 1000).toFixed(1)}k</p>
          <p className="text-slate-400 text-sm mt-1">Total Mass Moved (kg)</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
              <TrophyIcon className="w-7 h-7 text-yellow-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Recent</span>
          </div>
          <p className="text-lg font-bold truncate">
            {recentWorkout ? recentWorkout.exercises[0]?.name || 'Unknown' : 'No workouts'}
          </p>
          <p className="text-slate-400 text-sm mt-1">Last Lift Recorded</p>
        </div>
      </div>

      {/* Insights Panel */}
      <InsightsPanel workouts={workouts} />

      {/* Recent Activity List */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 overflow-hidden">
        <h2 className="text-xl font-bold mb-6">Recent Records</h2>
        {workouts.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-500">No data found. Upload a Whoop screenshot to begin.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {workouts.slice(0, 5).map(workout => (
              <div key={workout.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{new Date(workout.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                  <p className="text-sm text-slate-400">{workout.exercises.length} Exercises • {workout.totalVolume.toLocaleString()}kg total</p>
                </div>
                <div className="flex -space-x-2">
                  {workout.exercises.slice(0, 3).map((ex, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">
                      {ex.name.charAt(0)}
                    </div>
                  ))}
                  {workout.exercises.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold">
                      +{workout.exercises.length - 3}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
