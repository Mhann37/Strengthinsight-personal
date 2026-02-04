import React, { useMemo } from 'react';
import { Workout } from '../types';
import { ArrowTrendingUpIcon, CalendarDaysIcon, BoltIcon } from '@heroicons/react/24/outline';
import { parseWorkoutDate } from '../utils/date';

interface InsightsPanelProps {
  workouts: Workout[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ workouts }) => {
  const insights = useMemo(() => {
    if (workouts.length === 0) {
      return {
        weeklyFrequency: 0,
        streak: 0,
        recentProgress: 0,
      };
    }

    const workoutsSorted = [...workouts]
      .map((w) => ({ w, d: parseWorkoutDate(w.date) }))
      .filter(({ d }) => !!d)
      .sort((a, b) => b.d!.getTime() - a.d!.getTime())
      .map(({ w }) => w);

    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const recentWorkouts = workouts.filter((w) => {
      const d = parseWorkoutDate(w.date);
      return d ? d.getTime() >= weekAgo.getTime() : false;
    });

    const weeklyFrequency = recentWorkouts.length;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const hasWorkout = workouts.some((w) => {
        const d = parseWorkoutDate(w.date);
        if (!d) return false;
        return (
          d.getFullYear() === currentDate.getFullYear() &&
          d.getMonth() === currentDate.getMonth() &&
          d.getDate() === currentDate.getDate()
        );
      });

      if (hasWorkout) streak++;
      else if (streak > 0) break;

      currentDate.setDate(currentDate.getDate() - 1);
    }

    const recentProgress =
      workoutsSorted.length >= 2
        ? ((workoutsSorted[0].totalVolume || 0) - (workoutsSorted[1].totalVolume || 0)) /
          Math.max(workoutsSorted[1].totalVolume || 1, 1)
        : 0;

    return {
      weeklyFrequency,
      streak,
      recentProgress: Math.round(recentProgress * 100),
    };
  }, [workouts]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8">
      <h3 className="text-xl font-bold mb-6">Training Insights</h3>

      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
          <div className="p-3 bg-blue-600/10 rounded-xl">
            <CalendarDaysIcon className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-200">Weekly Frequency</p>
            <p className="text-xs text-slate-500">Sessions in last 7 days</p>
          </div>
          <p className="text-2xl font-mono font-bold text-white">{insights.weeklyFrequency}</p>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
          <div className="p-3 bg-orange-500/10 rounded-xl">
            <BoltIcon className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-200">Current Streak</p>
            <p className="text-xs text-slate-500">Consecutive training days</p>
          </div>
          <p className="text-2xl font-mono font-bold text-white">{insights.streak}</p>
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-200">Recent Progress</p>
            <p className="text-xs text-slate-500">Volume change vs last session</p>
          </div>
          <p className={`text-2xl font-mono font-bold ${insights.recentProgress >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {insights.recentProgress >= 0 ? '+' : ''}
            {insights.recentProgress}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsightsPanel;
