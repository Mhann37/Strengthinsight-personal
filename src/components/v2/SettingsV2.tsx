import React from 'react';
import type { User } from 'firebase/auth';
import type { Unit } from '../../../utils/unit';
import { Workout } from '../../../types';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface SettingsV2Props {
  user: User;
  unit: Unit;
  setUnit: (u: Unit) => Promise<void>;
  isLoading: boolean;
  workouts: Workout[];
  onLogout: () => void;
}

const SettingsV2: React.FC<SettingsV2Props> = ({ user, unit, setUnit, isLoading, workouts, onLogout }) => {
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
      <header>
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">App</p>
        <h1 className="text-3xl font-bold">Settings</h1>
      </header>

      {/* Unit preference */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Display</p>
        <h2 className="text-lg font-bold mb-4">Weight Units</h2>
        <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
          <button
            disabled={isLoading}
            onClick={() => setUnit('kg')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${unit === 'kg' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Metric (kg)
          </button>
          <button
            disabled={isLoading}
            onClick={() => setUnit('lbs')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${unit === 'lbs' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Imperial (lbs)
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Controls how weights and volume are displayed. Storage is always in kg for consistent analytics.
        </p>
      </section>

      {/* Account */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Account</p>
        <h2 className="text-lg font-bold mb-4">Profile</h2>
        <div className="flex items-center gap-3 mb-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-12 h-12 rounded-full border border-slate-700" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-base font-bold text-slate-400 uppercase">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <p className="font-bold text-slate-200">{user.displayName || 'Athlete'}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
        </p>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors font-bold"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </section>

      {/* About */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">App</p>
        <h2 className="text-lg font-bold mb-2">About StrengthInsight</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          StrengthInsight turns your WHOOP Strength Trainer screenshots and Hevy exports into progression analytics,
          personal records, and recovery-correlated performance insights — no wearable API required.
        </p>
        <p className="text-xs text-slate-600 mt-3">V2</p>
      </section>
    </div>
  );
};

export default SettingsV2;
