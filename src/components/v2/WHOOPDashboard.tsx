import React, { useEffect, useState } from 'react';
import { getWHOOPData, WHOOPDashboard } from '../../services/whoopService';
import {
  HeartIcon,
  FireIcon,
  MoonIcon,
  BoltIcon,
} from '@heroicons/react/24/solid';

interface WHOOPDashboardProps {
  refreshTrigger?: number;
}

export const WHOOPDashboardComponent: React.FC<WHOOPDashboardProps> = ({ refreshTrigger = 0 }) => {
  const [data, setData] = useState<WHOOPDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const whoopData = await getWHOOPData(refreshTrigger > 0);
        setData(whoopData);
        setError(null);
      } catch (err) {
        setError('Failed to load WHOOP data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-800/50 border border-red-500/30 rounded-lg p-4 mb-6">
        <p className="text-red-400 text-sm">{error || 'Unable to load WHOOP data'}</p>
      </div>
    );
  }

  const getRecoveryColor = (score: number | undefined) => {
    if (!score) return 'text-slate-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStrainColor = (score: number | undefined) => {
    if (!score) return 'text-slate-400';
    if (score >= 12) return 'text-red-400';
    if (score >= 8) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="space-y-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <HeartIcon className="w-6 h-6 text-blue-500" />
          WHOOP Metrics
        </h2>
        <span className="text-xs text-slate-400">
          Updated {new Date(data.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      {/* Recovery & Sleep Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recovery Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 text-sm font-semibold">Recovery Score</h3>
            <HeartIcon className="w-5 h-5 text-red-500" />
          </div>
          {data.recovery ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${getRecoveryColor(data.recovery.recovery_score)}`}>
                  {Math.round(data.recovery.recovery_score)}
                </span>
                <span className="text-slate-400 text-sm">/ 100</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">RHR</p>
                  <p className="text-slate-200 font-medium">{Math.round(data.recovery.resting_heart_rate)} bpm</p>
                </div>
                <div>
                  <p className="text-slate-400">HRV</p>
                  <p className="text-slate-200 font-medium">{Math.round(data.recovery.hrv_rmssd)} ms</p>
                </div>
                <div>
                  <p className="text-slate-400">SpO₂</p>
                  <p className="text-slate-200 font-medium">{Math.round(data.recovery.spo2_percentage)}%</p>
                </div>
                <div>
                  <p className="text-slate-400">Balance</p>
                  <p className="text-slate-200 font-medium">{data.recovery.hrv_balanced ? 'Good' : 'Fair'}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No data available</p>
          )}
        </div>

        {/* Sleep Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-300 text-sm font-semibold">Sleep Quality</h3>
            <MoonIcon className="w-5 h-5 text-blue-400" />
          </div>
          {data.sleep ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-400">
                  {Math.round(data.sleep.total_minutes / 60)}h {Math.round(data.sleep.total_minutes % 60)}m
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Need</p>
                  <p className="text-slate-200 font-medium">{Math.round(data.sleep.need_minutes / 60)}h</p>
                </div>
                <div>
                  <p className="text-slate-400">Efficiency</p>
                  <p className="text-slate-200 font-medium">{Math.round(data.sleep.efficiency_percentage)}%</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400">Quality</p>
                  <p className="text-slate-200 font-medium">{data.sleep.qualitative_score}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* Strain Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-300 text-sm font-semibold">Strain & Exertion</h3>
          <BoltIcon className="w-5 h-5 text-yellow-500" />
        </div>
        {data.strain ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-slate-400 text-xs mb-1">Strain Score</p>
              <p className={`text-2xl font-bold ${getStrainColor(data.strain.strain_score)}`}>
                {Math.round(data.strain.strain_score * 10) / 10}
              </p>
              <p className="text-slate-400 text-xs mt-1">/ 21</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Sport</p>
              <p className="text-slate-200 font-medium text-sm">{data.strain.sport}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Avg HR</p>
              <p className="text-slate-200 font-medium">{Math.round(data.strain.average_heart_rate)} bpm</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Max HR</p>
              <p className="text-slate-200 font-medium">{Math.round(data.strain.max_heart_rate)} bpm</p>
            </div>
            <div className="col-span-2 md:col-span-4">
              <p className="text-slate-400 text-xs mb-1">Energy Expended</p>
              <p className="text-slate-200 font-medium">{Math.round(data.strain.kilojoules)} kJ</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No data available</p>
        )}
      </div>
    </div>
  );
};

export default WHOOPDashboardComponent;
