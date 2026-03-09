import React from 'react';
import type { User } from 'firebase/auth';
import type { Unit } from '../../../utils/unit';
import type { Workout } from '../../../types';

interface SettingsV2Props {
  user: User;
  unit: Unit;
  setUnit: (u: Unit) => void;
  isLoading: boolean;
  workouts: Workout[];
  onLogout: () => void;
}

const SettingsV2: React.FC<SettingsV2Props> = ({ user, unit, setUnit, isLoading, onLogout }) => {
  return (
    <div className="max-w-lg mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="bg-slate-900 rounded-2xl p-6 space-y-4 border border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Units</h2>
        <div className="flex bg-slate-950 border border-slate-800 rounded-2xl p-1 w-48">
          <button
            disabled={isLoading}
            onClick={() => setUnit('kg')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              unit === 'kg' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Metric
          </button>
          <button
            disabled={isLoading}
            onClick={() => setUnit('lbs')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              unit === 'lbs' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Imperial
          </button>
        </div>
      </section>

      <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Account</h2>
        <p className="text-sm text-slate-300 mb-4">{user.email}</p>
        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          Logout
        </button>
      </section>
    </div>
  );
};

export default SettingsV2;
