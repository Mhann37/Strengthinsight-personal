
import React from 'react';
import { Workout } from '../types';
import { TrashIcon, CalendarIcon, ScaleIcon } from '@heroicons/react/24/outline';

interface HistoryProps {
  workouts: Workout[];
  onDelete: (id: string) => void;
}

const History: React.FC<HistoryProps> = ({ workouts, onDelete }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workout Logs</h1>
          <p className="text-slate-400">Detailed history of all your recorded sessions.</p>
        </div>
      </header>

      {workouts.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
          <p className="text-slate-500 mb-4">You haven't logged any workouts yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {workouts.map(workout => (
            <div key={workout.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group">
              <div className="bg-slate-800/30 p-4 px-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-600/20 p-2 rounded-xl">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="font-bold">
                    {new Date(workout.date).toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>
                <button 
                  onClick={() => onDelete(workout.id)}
                  className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workout.exercises.map((ex, idx) => (
                    <div key={idx} className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-4">
                      <h4 className="font-bold text-blue-400 mb-3 flex items-center space-x-2">
                        <span>{ex.name}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                          {ex.sets.length} Sets
                        </span>
                      </h4>
                      <div className="space-y-1.5">
                        {ex.sets.map((set, sIdx) => (
                          <div key={sIdx} className="flex justify-between text-sm">
                            <span className="text-slate-500">Set {set.setNumber}</span>
                            <span className="font-mono text-slate-300">
                              {set.reps} × {set.weight}{set.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-slate-800 p-4 px-6 bg-slate-900/50 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-slate-400">
                  <ScaleIcon className="w-4 h-4" />
                  <span>Total Volume Moved</span>
                </div>
                <span className="font-bold text-slate-200">{workout.totalVolume.toLocaleString()}kg</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
