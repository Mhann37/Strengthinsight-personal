
import React from 'react';
import { Workout } from '../types';
import WeeklyHeatMap from './WeeklyHeatMap';
import InsightsPanel from './InsightsPanel';
import { FireIcon, BoltIcon, TrophyIcon } from '@heroicons/react/24/solid';

interface DashboardProps {
  workouts: Workout[];
  userName?: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ workouts, userName }) => {
  const totalVolume = workouts.reduce((acc, w) => acc + (w.totalVolume || 0), 0);
  const totalWorkouts = workouts.length;
  const recentWorkout = workouts[0];
  const firstName = userName ? userName.split(' ')[0] : 'Athlete';

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}</h1>
        <p className="text-slate-400">Here's your strength progression at a glance.</p>
      </header>

      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 lg:p-8">
        <h2 className="text-xl font-bold mb-4">Weekly Performance Matrix</h2>
        <WeeklyHeatMap workouts={workouts} />
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <FireIcon className="w-8 h-8 text-orange-500 mb-4" />
          <p className="text-3xl font-bold">{totalWorkouts}</p>
          <p className="text-slate-400 text-sm">Total Workouts</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <BoltIcon className="w-8 h-8 text-blue-500 mb-4" />
          <p className="text-3xl font-bold">{(totalVolume / 1000).toFixed(1)}k</p>
          <p className="text-slate-400 text-sm">Total Volume (kg)</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <TrophyIcon className="w-8 h-8 text-yellow-500 mb-4" />
          <p className="text-lg font-bold truncate">{recentWorkout?.exercises[0]?.name || 'N/A'}</p>
          <p className="text-slate-400 text-sm">Recent Exercise</p>
        </div>
      </div>

      <InsightsPanel workouts={workouts} />
    </div>
  );
};

export default Dashboard;
