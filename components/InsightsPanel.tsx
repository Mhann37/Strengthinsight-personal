
import React, { useMemo } from 'react';
import { Workout } from '../types';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  SparklesIcon, 
  ScaleIcon, 
  TrophyIcon 
} from '@heroicons/react/24/outline';

interface InsightsPanelProps {
  workouts: Workout[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ workouts }) => {
  const insights = useMemo(() => {
    if (workouts.length === 0) return null;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Weekly Volume Trend
    let thisWeekVol = 0;
    let lastWeekVol = 0;
    
    // 2. Heaviest Lift
    let maxWeight = 0;
    let maxWeightName = '-';

    // 3. Most Frequent Exercise
    const exerciseCounts: Record<string, number> = {};

    // 4. Monthly Reps
    let monthlyReps = 0;

    workouts.forEach(w => {
      const d = new Date(w.date);
      
      // Volume Trend
      if (d >= oneWeekAgo) {
        thisWeekVol += w.totalVolume;
      } else if (d >= twoWeeksAgo && d < oneWeekAgo) {
        lastWeekVol += w.totalVolume;
      }

      // Monthly Reps
      if (d >= thirtyDaysAgo) {
        w.exercises.forEach(ex => {
          ex.sets.forEach(s => {
            monthlyReps += s.reps;
          });
        });
      }

      // Heaviest Lift & Frequency (All time analysis)
      w.exercises.forEach(ex => {
        // Frequency
        exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;

        // Max Weight
        ex.sets.forEach(s => {
          if (s.weight > maxWeight) {
            maxWeight = s.weight;
            maxWeightName = ex.name;
          }
        });
      });
    });

    // Calculate Trend Percentage
    let trendPercent = 0;
    if (lastWeekVol > 0) {
      trendPercent = Math.round(((thisWeekVol - lastWeekVol) / lastWeekVol) * 100);
    } else if (thisWeekVol > 0) {
      trendPercent = 100; // Treated as 100% increase if starting from 0
    }

    // Determine Favorite
    let favoriteExercise = '-';
    let maxCount = 0;
    Object.entries(exerciseCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteExercise = name;
      }
    });

    return {
      trend: {
        value: trendPercent,
        current: thisWeekVol,
        isPositive: trendPercent >= 0
      },
      heaviest: {
        weight: maxWeight,
        name: maxWeightName
      },
      favorite: {
        name: favoriteExercise,
        count: maxCount
      },
      reps: monthlyReps
    };
  }, [workouts]);

  if (!insights) return null;

  return (
    <section>
      <h2 className="text-xl font-bold mb-6">AI Insights</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Volume Trend */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className={`absolute top-0 right-0 p-32 blur-3xl opacity-10 rounded-full ${insights.trend.isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <div className="flex justify-between items-start z-10">
            <div className={`p-3 rounded-2xl ${insights.trend.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
              {insights.trend.isPositive ? <ArrowTrendingUpIcon className="w-6 h-6" /> : <ArrowTrendingDownIcon className="w-6 h-6" />}
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-bold text-white mb-1">
              {insights.trend.isPositive ? '+' : ''}{insights.trend.value}%
            </p>
            <p className="text-sm text-slate-400 font-medium">Volume vs Last Week</p>
            <p className="text-xs text-slate-500 mt-2">
              {Math.round(insights.trend.current / 1000)}k kg moved this week
            </p>
          </div>
        </div>

        {/* Card 2: Heaviest Lift */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="absolute top-0 right-0 p-32 bg-amber-500 blur-3xl opacity-5 rounded-full"></div>
          <div className="flex justify-between items-start z-10">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <TrophyIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-bold text-white mb-1">
              {insights.heaviest.weight}<span className="text-xl text-slate-500 ml-1">kg</span>
            </p>
            <p className="text-sm text-slate-400 font-medium line-clamp-1">{insights.heaviest.name}</p>
            <p className="text-xs text-slate-500 mt-2">Your heaviest lift recorded</p>
          </div>
        </div>

        {/* Card 3: Favorite Exercise */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="absolute top-0 right-0 p-32 bg-purple-500 blur-3xl opacity-5 rounded-full"></div>
          <div className="flex justify-between items-start z-10">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <SparklesIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-xl font-bold text-white mb-1 line-clamp-2 leading-tight">
              {insights.favorite.name}
            </p>
            <p className="text-sm text-slate-400 font-medium mt-1">Most Frequent</p>
            <p className="text-xs text-slate-500 mt-2">Performed in {insights.favorite.count} sessions</p>
          </div>
        </div>

        {/* Card 4: Monthly Reps */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute top-0 right-0 p-32 bg-blue-500 blur-3xl opacity-5 rounded-full"></div>
          <div className="flex justify-between items-start z-10">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <ScaleIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-bold text-white mb-1">
              {insights.reps.toLocaleString()}
            </p>
            <p className="text-sm text-slate-400 font-medium">Monthly Reps</p>
            <p className="text-xs text-slate-500 mt-2">Total work in last 30 days</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InsightsPanel;
