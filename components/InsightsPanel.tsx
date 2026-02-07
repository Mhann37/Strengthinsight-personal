import React, { useMemo } from 'react';
import { Workout } from '../types';
import { useUserSettings } from '../contexts/UserSettingsContext';
import { calcWorkoutVolumeKg, fromKg, normalizeUnit, toKg } from '../utils/unit';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  ScaleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

interface InsightsPanelProps {
  workouts: Workout[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ workouts }) => {
  const { settings } = useUserSettings();
  const unit = settings.unit;

  const insights = useMemo(() => {
    if (workouts.length === 0) return null;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Weekly Volume Trend (canonical kg)
    let thisWeekVolKg = 0;
    let lastWeekVolKg = 0;

    // 2. Heaviest Lift (canonical kg)
    let maxWeightKg = 0;
    let maxWeightName = '-';

    // 3. Most Frequent Exercise
    const exerciseCounts: Record<string, number> = {};

    // 4. Monthly Reps
    let monthlyReps = 0;

    workouts.forEach((w) => {
      const d = new Date(w.date);

      // Volume Trend: prefer stored totalVolume (kg), otherwise compute safely
      const workoutVolKg =
        typeof (w as any).totalVolume === 'number' ? (w as any).totalVolume : calcWorkoutVolumeKg(w);

      if (d >= oneWeekAgo) {
        thisWeekVolKg += workoutVolKg;
      } else if (d >= twoWeeksAgo && d < oneWeekAgo) {
        lastWeekVolKg += workoutVolKg;
      }

      // Monthly Reps
      if (d >= thirtyDaysAgo) {
        w.exercises.forEach((ex) => {
          ex.sets.forEach((s) => {
            monthlyReps += Number((s as any).reps) || 0;
          });
        });
      }

      // Heaviest Lift & Frequency (All time analysis)
      w.exercises.forEach((ex) => {
        // Frequency
        exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + 1;

        // Max Weight: compare in kg so mixed units don't lie
        ex.sets.forEach((s: any) => {
          const candidateKg = toKg(Number(s?.weight) || 0, normalizeUnit(s?.unit));
          if (candidateKg > maxWeightKg) {
            maxWeightKg = candidateKg;
            maxWeightName = ex.name;
          }
        });
      });
    });

    // Calculate Trend Percentage
    let trendPercent = 0;
    if (lastWeekVolKg > 0) {
      trendPercent = Math.round(((thisWeekVolKg - lastWeekVolKg) / lastWeekVolKg) * 100);
    } else if (thisWeekVolKg > 0) {
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

    // Coach-style conversational insight
let coachInsight = {
  title: "Not enough data yet",
  message: "Upload a few more workouts to unlock personalised insights.",
};

const weeklySessions = workouts.filter((w) => {
  const d = new Date(w.date);
  return d >= oneWeekAgo;
}).length;

if (weeklySessions >= 2) {
  if (trendPercent < 0 && maxWeightKg > 0) {
    coachInsight = {
      title: "Heavier focus this week",
      message:
        "Your total training volume dipped slightly, but you still hit heavy lifts. This often happens during higher-intensity phases and isn’t necessarily a negative.",
    };
  } else if (trendPercent > 0) {
    coachInsight = {
      title: "Training volume is building",
      message:
        "You moved more total weight than last week, which suggests good consistency and progression across sessions.",
    };
  } else {
    coachInsight = {
      title: "Stable training pattern",
      message:
        "Your training volume is holding steady week to week — a good sign of consistency.",
    };
  }
}

    
    return {
      trend: {
        value: trendPercent,
        currentKg: thisWeekVolKg,
        isPositive: trendPercent >= 0,
      },
      heaviest: {
        weightKg: maxWeightKg,
        name: maxWeightName,
      },
      favorite: {
        name: favoriteExercise,
        count: maxCount,
      },
      reps: monthlyReps,
      coachInsight,
    };
  }, [workouts]);

  if (!insights) return null;

  const weeklyMovedDisplay = fromKg(insights.trend.currentKg, unit);
  const heaviestDisplay = fromKg(insights.heaviest.weightKg, unit);

  return (
    <section>
      <h2 className="text-xl font-bold mb-6">AI Insights</h2>
      {/* Coach Insight */}
<div className="mb-6 bg-slate-900 border border-slate-800 rounded-[2rem] p-4 sm:p-6 flex gap-4 items-start">
  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
    <SparklesIcon className="w-6 h-6" />
  </div>
  <div>
    <p className="text-sm text-slate-400 mb-1">Coach Insight</p>
    <p className="text-base font-semibold text-white">
      {insights.coachInsight.title}
    </p>
    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
      {insights.coachInsight.message}
    </p>
  </div>
</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Volume Trend */}
<div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-[2rem] sm:aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all">          <div
            className={`absolute top-0 right-0 p-32 blur-3xl opacity-10 rounded-full ${
              insights.trend.isPositive ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          ></div>
          <div className="flex justify-between items-start z-10">
            <div
              className={`p-3 rounded-2xl ${
                insights.trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              {insights.trend.isPositive ? (
                <ArrowTrendingUpIcon className="w-6 h-6" />
              ) : (
                <ArrowTrendingDownIcon className="w-6 h-6" />
              )}
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-bold text-white mb-1">
              {insights.trend.isPositive ? '+' : ''}
              {insights.trend.value}%
            </p>
            <p className="text-sm text-slate-400 font-medium">Volume vs Last Week</p>
            <p className="text-xs text-slate-500 mt-2">
              {Math.round(weeklyMovedDisplay / 1000)}k {unit} moved this week
            </p>
          </div>
        </div>

        {/* Card 2: Heaviest Lift */}
<div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-[2rem] sm:aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all">          <div className="absolute top-0 right-0 p-32 bg-amber-500 blur-3xl opacity-5 rounded-full"></div>
          <div className="flex justify-between items-start z-10">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <TrophyIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-bold text-white mb-1">
              {Math.round(heaviestDisplay)}
              <span className="text-xl text-slate-500 ml-1">{unit}</span>
            </p>
            <p className="text-sm text-slate-400 font-medium line-clamp-1">{insights.heaviest.name}</p>
            <p className="text-xs text-slate-500 mt-2">Your heaviest lift recorded</p>
          </div>
        </div>

        {/* Card 3: Favorite Exercise */}
<div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-[2rem] sm:aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all">          <div className="absolute top-0 right-0 p-32 bg-purple-500 blur-3xl opacity-5 rounded-full"></div>
          <div className="flex justify-between items-start z-10">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <SparklesIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-xl font-bold text-white mb-1 line-clamp-2 leading-tight">{insights.favorite.name}</p>
            <p className="text-sm text-slate-400 font-medium mt-1">Most Frequent</p>
            <p className="text-xs text-slate-500 mt-2">Performed in {insights.favorite.count} sessions</p>
          </div>
        </div>

        {/* Card 4: Monthly Reps */}
<div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-[2rem] sm:aspect-square flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all">          <div className="absolute top-0 right-0 p-32 bg-blue-500 blur-3xl opacity-5 rounded-full"></div>
          <div className="flex justify-between items-start z-10">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <ScaleIcon className="w-6 h-6" />
            </div>
          </div>
          <div className="z-10">
            <p className="text-4xl font-bold text-white mb-1">{insights.reps.toLocaleString()}</p>
            <p className="text-sm text-slate-400 font-medium">Monthly Reps</p>
            <p className="text-xs text-slate-500 mt-2">Total work in last 30 days</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InsightsPanel;
