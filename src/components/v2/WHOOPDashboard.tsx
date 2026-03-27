import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PolarAngleAxis
} from 'recharts';
import {
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, CheckCircleIcon,
  ExclamationIcon, HeartIcon, MoonIcon, BoltIcon, ClockIcon
} from '@heroicons/react/24/outline';
import { getWHOOPData, forceFullSync, getHistoricalData, WHOOPDashboard } from '../../services/whoopService';

// ============================================================================
// METRIC CARDS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'caution' | 'warning';
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  secondaryValue?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title, value, unit, status = 'good', icon, trend, secondaryValue
}) => {
  const statusColors = {
    good: 'bg-gradient-to-br from-green-50 to-green-100 border-green-300',
    caution: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300',
    warning: 'bg-gradient-to-br from-red-50 to-red-100 border-red-300',
  };

  return (
    <div className={`rounded-lg p-6 border-2 ${statusColors[status]} shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {unit && <span className="text-sm text-gray-600">{unit}</span>}
          </div>
          {secondaryValue && <p className="text-xs text-gray-500 mt-1">{secondaryValue}</p>}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs font-medium">
          {trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />}
          {trend === 'down' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />}
          {trend === 'stable' && <span className="text-gray-600">Stable</span>}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CHART COMPONENTS
// ============================================================================

const RecoveryTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recovery Trend (7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRecovery" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorRecovery)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const SleepQualityChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sleep Quality Trend (7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" name="Sleep Quality" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const StrainTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Strain Accumulation (7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => value.toFixed(1)} />
          <Bar dataKey="value" fill="#ef4444" name="Strain Score" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const SleepBreakdownChart: React.FC<{ data: any }> = ({ data }) => {
  if (!data) return null;

  const chartData = [
    { name: 'Deep Sleep', value: data.deep_sleep_percentage || 0 },
    { name: 'REM Sleep', value: data.rem_sleep_percentage || 0 },
    { name: 'Light Sleep', value: data.light_sleep_percentage || 0 },
    { name: 'Awake', value: (100 - (data.efficiency_percentage || 0)) },
  ];

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sleep Stages Breakdown</h3>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={chartData}>
          <PolarAngleAxis dataKey="name" />
          <Radar name="Duration %" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

const WHOOPDashboardComponent: React.FC = () => {
  const [data, setData] = useState<WHOOPDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const whoopData = await getWHOOPData();
      setData(whoopData);
      setLastUpdated(new Date(whoopData.lastUpdated).toLocaleTimeString());
    } catch (error) {
      console.error('Failed to load WHOOP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFullSync = async () => {
    setLoading(true);
    try {
      const whoopData = await forceFullSync();
      setData(whoopData);
      setLastUpdated(new Date(whoopData.lastUpdated).toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-6">
        <p className="text-red-800">Failed to load WHOOP data</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Prepare trend data
  const recoveryTrend7d = data.historical?.trends?.recovery_7d || [];
  const sleepQuality7d = data.historical?.trends?.sleep_quality_7d || [];
  const strain7d = data.historical?.trends?.strain_7d || [];

  return (
    <div className="space-y-8 pb-8">
      {/* Header with sync controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Health Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated}
            {data.lastFullSync && ` • Full sync: ${new Date(data.lastFullSync).toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={handleFullSync}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <ClockIcon className="w-4 h-4" />
          Full Sync
        </button>
      </div>

      {/* Primary Metrics - Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recovery Card */}
        <MetricCard
          title="Recovery Score"
          value={Math.round(data.recovery?.recovery_score || 0)}
          unit="%"
          status={data.recovery?.recovery_status || 'caution'}
          icon={<HeartIcon className="w-6 h-6 text-red-600" />}
          secondaryValue={`Ready: ${data.recovery?.ready_to_train ? '✅ Yes' : '❌ No'}`}
        />

        {/* Sleep Duration Card */}
        <MetricCard
          title="Last Night's Sleep"
          value={data.sleep ? (data.sleep.duration_minutes / 60).toFixed(1) : '—'}
          unit="hours"
          status={data.sleep && data.sleep.duration_minutes > 360 ? 'good' : 'caution'}
          icon={<MoonIcon className="w-6 h-6 text-indigo-600" />}
          secondaryValue={`Need: ${data.sleep ? (data.sleep.need_minutes / 60).toFixed(1) : '—'} hours`}
        />

        {/* Strain Score Card */}
        <MetricCard
          title="Today's Strain"
          value={data.strain?.strain_score.toFixed(1) || '—'}
          unit="/ 21"
          status={data.strain && data.strain.strain_score < 10 ? 'good' : 'caution'}
          icon={<BoltIcon className="w-6 h-6 text-orange-600" />}
          secondaryValue={`Capacity: ${data.recovery?.strain_capacity_remaining.toFixed(1) || '—'}`}
        />
      </div>

      {/* Detailed Recovery Metrics */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Recovery Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-gray-600">HRV (Current)</p>
            <p className="text-2xl font-bold text-blue-600">{data.recovery?.hrv.value.toFixed(0) || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">ms (avg: {data.recovery?.hrv.average.toFixed(0)})</p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-medium text-gray-600">Resting Heart Rate</p>
            <p className="text-2xl font-bold text-green-600">{data.recovery?.resting_heart_rate.value.toFixed(0) || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">bpm (avg: {data.recovery?.resting_heart_rate.average.toFixed(0)})</p>
          </div>

          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs font-medium text-gray-600">Body Temperature</p>
            <p className="text-2xl font-bold text-purple-600">{data.recovery?.body_temperature.value.toFixed(1) || '—'}°C</p>
            <p className="text-xs text-gray-500 mt-1">{data.recovery?.body_temperature.anomaly ? '⚠️ Anomaly' : '✓ Normal'}</p>
          </div>

          <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <p className="text-xs font-medium text-gray-600">Blood Oxygen</p>
            <p className="text-2xl font-bold text-cyan-600">{data.recovery?.spo2_percentage.toFixed(1) || '—'}%</p>
            <p className="text-xs text-gray-500 mt-1">SpO₂ level</p>
          </div>
        </div>
      </div>

      {/* Sleep Analysis */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Sleep Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs font-medium text-gray-600">Deep Sleep</p>
            <p className="text-2xl font-bold text-indigo-600">{data.sleep?.deep_sleep_percentage || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">{data.sleep?.deep_sleep_minutes || 0} min</p>
          </div>

          <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
            <p className="text-xs font-medium text-gray-600">REM Sleep</p>
            <p className="text-2xl font-bold text-pink-600">{data.sleep?.rem_sleep_percentage || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">{data.sleep?.rem_sleep_minutes || 0} min</p>
          </div>

          <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
            <p className="text-xs font-medium text-gray-600">Light Sleep</p>
            <p className="text-2xl font-bold text-sky-600">{data.sleep?.light_sleep_percentage || 0}%</p>
            <p className="text-xs text-gray-500 mt-1">{data.sleep?.light_sleep_minutes || 0} min</p>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs font-medium text-gray-600">Sleep Quality</p>
            <p className="text-2xl font-bold text-orange-600">{data.sleep?.sleep_quality_score || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Score: {data.sleep?.qualitative_score}</p>
          </div>
        </div>
      </div>

      {/* Strain Details */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Training Details</h3>
        {data.strain ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-medium text-gray-600">Sport</p>
              <p className="text-lg font-bold text-red-600">{data.strain.sport}</p>
              <p className="text-xs text-gray-500 mt-1">{Math.round(data.strain.duration_minutes)} min</p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs font-medium text-gray-600">Total Strain</p>
              <p className="text-2xl font-bold text-orange-600">{data.strain.strain_score.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">/ 21</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-medium text-gray-600">Cardio Strain</p>
              <p className="text-2xl font-bold text-amber-600">{data.strain.cardio_strain.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Avg HR: {Math.round(data.strain.average_heart_rate)}</p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs font-medium text-gray-600">Energy Burned</p>
              <p className="text-2xl font-bold text-yellow-600">{Math.round(data.strain.calories_burned)}</p>
              <p className="text-xs text-gray-500 mt-1">kcal ({data.strain.kilojoules.toFixed(0)} kJ)</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 py-8">No strain data for today</p>
        )}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecoveryTrendChart data={recoveryTrend7d} />
        <SleepQualityChart data={sleepQuality7d} />
        <StrainTrendChart data={strain7d} />
        {data.sleep && <SleepBreakdownChart data={data.sleep} />}
      </div>

      {/* Ready to Train? Insight Card */}
      <div className={`rounded-lg p-6 shadow-sm border-2 ${
        data.recovery?.ready_to_train
          ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
          : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300'
      }`}>
        <div className="flex items-center gap-4">
          <div className="text-4xl">
            {data.recovery?.ready_to_train ? '✅' : '⚠️'}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {data.recovery?.ready_to_train ? 'Ready to Train!' : 'Recovery Day Recommended'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {data.recovery?.ready_to_train
                ? `Your recovery score is ${Math.round(data.recovery.recovery_score)}% - You have plenty of strain capacity remaining!`
                : 'Focus on recovery today. Light activity only recommended.'}
            </p>
          </div>
        </div>
      </div>

      {/* Data Summary Footer */}
      <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p>Data Points: {data.dataPoints} | Date Range: {data.dateRange.start} to {data.dateRange.end}</p>
        <p className="mt-2">💡 Tip: Click "Full Sync" to import all historical WHOOP data. Subsequent checks use smart incremental caching.</p>
      </div>
    </div>
  );
};

export default WHOOPDashboardComponent;
