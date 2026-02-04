import React, { useMemo } from 'react';
import { Workout } from '../types';
import { TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { parseWorkoutDate } from '../utils/date';

const History: React.FC<{ workouts: Workout[]; onDelete: (id: string) => void }> = ({ workouts, onDelete }) => {
  const sortedWorkouts = useMemo(() => {
    return [...workouts]
      .map((w) => ({ w, d: parseWorkoutDate(w.date) }))
      .sort((a, b) => (b.d?.getTime() || 0) - (a.d?.getTime() || 0))
      .map(({ w }) => w);
  }, [workouts]);

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h1 className="text-3xl font-bold mb-2">Workout Logs</h1>
        <p className="text-slate-400">Review and manage your saved sessions.</p>
      </header>

      {sortedWorkouts.length === 0 ? (
        <div className="text-center py-20">
          <ClockIcon className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 text-lg font-medium">No workouts logged yet.</p>
          <p className="text-slate-600 text-sm mt-2">Upload your first session to start tracking progress.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedWorkouts.map((workout) => {
            const d = parseWorkoutDate(workout.date);
            const dateLabel = d ? d.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : workout.date;

            return (
              <div key={workout.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{dateLabel}</h3>
                    <p className="text-slate-400 text-sm">
                      {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''} •{' '}
                      {((workout.totalVolume || 0) / 1000).toFixed(2)}t volume
                    </p>
                  </div>
                  <button
                    onClick={() => workout.id && onDelete(workout.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {workout.exercises.map((ex, idx) => (
                    <div key={idx} className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-200">{ex.name}</p>
                        <p className="text-xs text-blue-400 font-bold">{ex.muscleGroup || '—'}</p>
                      </div>
                      <div className="text-xs text-slate-500">
                        {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''} •{' '}
                        {ex.sets.reduce((acc, s) => acc + (s.reps * (s.weight || 0)), 0).toLocaleString()}kg tonnage
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
