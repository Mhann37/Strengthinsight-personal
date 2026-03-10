import React from 'react';
import { Workout } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { calcWorkoutVolumeKg, fromKg, normalizeUnit } from '../../../utils/unit';
import { TrashIcon, CalendarIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { getSessionFocusClassification, type FocusClassification } from '../../utils/analyticsCalculations';

interface HistoryV2Props {
  workouts: Workout[];
  onDelete: (id: string) => void;
}

// ── Focus badge ───────────────────────────────────────────────
const FOCUS_BADGE: Record<FocusClassification, { label: string; className: string }> = {
  Strength:    { label: 'Strength',    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  Hypertrophy: { label: 'Hypertrophy', className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
  Endurance:   { label: 'Endurance',   className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  Mixed:       { label: 'Mixed',       className: 'bg-slate-700/60 text-slate-400 border border-slate-600/40' },
};

const FocusBadge: React.FC<{ workout: Workout }> = ({ workout }) => {
  const fc = getSessionFocusClassification(workout);
  const { label, className } = FOCUS_BADGE[fc];
  return (
    <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${className}`}>
      {label}
    </span>
  );
};

// ── Component ─────────────────────────────────────────────────
const HistoryV2: React.FC<HistoryV2Props> = ({ workouts, onDelete }) => {
  const { settings } = useUserSettings();
  const unit = settings.unit;

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workout Logs</h1>
          <p className="text-slate-400">Detailed history of all your recorded sessions.</p>
        </div>
      </header>

      {workouts.length === 0 ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-20 text-center">
          <p className="text-slate-500 mb-4 font-medium">No workout history found yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {workouts.map((workout) => {
            const volKg =
              typeof (workout as any).totalVolume === 'number'
                ? (workout as any).totalVolume
                : calcWorkoutVolumeKg(workout);
            const volDisplay = fromKg(volKg, unit);

            return (
              <div
                key={workout.id}
                className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden group transition-all hover:border-slate-700"
              >
                {/* Header row */}
                <div className="bg-slate-800/30 p-5 px-8 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-600/20 p-2.5 rounded-xl">
                      <CalendarIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-200">
                          {new Date(workout.date).toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </h3>
                        {/* Feature 5 — Focus Classification Badge */}
                        <FocusBadge workout={workout} />
                      </div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
                        {new Date(workout.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(workout.id)}
                    className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Exercises */}
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workout.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-bold text-white text-lg leading-tight flex-1 mr-2">{ex.name}</h4>
                          <span className="text-[9px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-lg uppercase tracking-widest shrink-0">
                            {ex.muscleGroup || 'Other'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {ex.sets.map((set, sIdx) => (
                            <div key={sIdx} className="flex justify-between text-sm">
                              <span className="text-slate-500 font-medium">Set {set.setNumber}</span>
                              <span className="font-mono text-slate-300 font-bold">
                                {set.reps} <span className="text-slate-600">×</span> {set.weight}
                                <span className="text-[10px]">{normalizeUnit((set as any).unit)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-800 p-5 px-8 bg-slate-900/50 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <ScaleIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Total Session Volume</span>
                  </div>
                  <span className="text-xl font-mono font-bold text-blue-400">
                    {Math.round(volDisplay).toLocaleString()}
                    <span className="text-sm ml-1 opacity-50">{unit}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryV2;
