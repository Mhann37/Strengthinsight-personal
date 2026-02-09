import React from 'react';
import { Workout } from '../types';
import WeeklyHeatMap from './WeeklyHeatMap';
import InsightsPanel from './InsightsPanel';
import { useUserSettings } from '../contexts/UserSettingsContext';
import { fromKg, toKg, normalizeUnit } from '../utils/unit';
import { FireIcon, BoltIcon, TrophyIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

interface DashboardProps {
  workouts: Workout[];
  userName?: string | null;
}

type HeroStat = { label: string; value: React.ReactNode };

const HeroStatsRow: React.FC<{ stats: HeroStat[] }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-3 gap-3 md:hidden">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-3"
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-400">
            {s.label}
          </div>
          <div className="mt-1 text-lg font-bold leading-tight">{s.value}</div>
        </div>
      ))}
    </div>
  );
};

const getWorkoutDate = (w: any): Date | null => {
  const d = w?.date || w?.createdAt || w?.timestamp;
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const calcWorkoutVolumeKg = (w: any): number => {
  // Prefer stored totalVolume if present (already canonical kg per your Phase 1).
  if (typeof w?.totalVolume === 'number' && !Number.isNaN(w.totalVolume)) return w.totalVolume;

  // Fallback: compute from sets
  const exercises = Array.isArray(w?.exercises) ? w.exercises : [];
  let total = 0;

  for (const ex of exercises) {
    const sets = Array.isArray(ex?.sets) ? ex.sets : [];
    for (const s of sets) {
      const reps = Number(s?.reps) || 0;
      const weight = Number(s?.weight) || 0;
      const unit = normalizeUnit(s?.unit);
      const weightKg = toKg(weight, unit);
      total += reps * weightKg;
    }
  }
  return total;
};

const sanitizeWorkoutsForAI = (workouts: Workout[]) => {
  return (workouts || []).map((w: any) => {
    const dt = getWorkoutDate(w);
    return {
      date: dt ? dt.toISOString().slice(0, 10) : (w?.date || null),
      // Keep only what’s needed for analysis
      exercises: (w?.exercises || []).map((ex: any) => ({
        name: ex?.name || 'Unknown',
        muscleGroup: ex?.muscleGroup || null,
        sets: (ex?.sets || []).map((s: any) => ({
          reps: Number(s?.reps) || 0,
          // export weight in kg for consistency
          weightKg: toKg(Number(s?.weight) || 0, normalizeUnit(s?.unit)),
        })),
      })),
      // Helpful derived field
      totalVolumeKg: calcWorkoutVolumeKg(w),
    };
  });
};

const downloadJson = (filename: string, data: any) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};


const Dashboard: React.FC<DashboardProps> = ({ workouts, userName }) => {
  const { settings } = useUserSettings();
  const unit = settings.unit;

  // totalVolume is stored canonically in kg (Phase 1)
  const totalVolumeKg = workouts.reduce((acc, w) => acc + (w.totalVolume || 0), 0);
  const totalVolumeDisplay = fromKg(totalVolumeKg, unit);

  const totalWorkouts = workouts.length;
  const recentWorkout = React.useMemo(() => {
  if (!workouts?.length) return undefined;

  // If workouts are already newest-first, this still works.
  // If not, this tries to sort by date if present.
  const copy = [...workouts];
  copy.sort((a: any, b: any) => {
    const ad = new Date(a?.date || a?.createdAt || a?.timestamp || 0).getTime();
    const bd = new Date(b?.date || b?.createdAt || b?.timestamp || 0).getTime();
    return bd - ad;
  });
  return copy[0];
}, [workouts]);
  const firstName = userName ? userName.split(' ')[0] : 'Athlete';

  const lastWorkoutLabel = React.useMemo(() => {
    const raw: any = recentWorkout as any;
    const d = raw?.date || raw?.createdAt || raw?.timestamp;
    if (!d) return '—';

    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';

    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [recentWorkout]);

    const handleExportForAI = React.useCallback(() => {
    const dated = [...(workouts || [])]
      .map((w: any) => ({ w, d: getWorkoutDate(w) }))
      .filter((x) => x.d)
      .sort((a, b) => a.d!.getTime() - b.d!.getTime());

    const start = dated.length ? dated[0].d!.toISOString().slice(0, 10) : null;
    const end = dated.length ? dated[dated.length - 1].d!.toISOString().slice(0, 10) : null;

    const exportPayload = {
      exportVersion: '1.0',
      generatedAt: new Date().toISOString(),
      app: 'StrengthInsight',
      unitPreference: unit, // user display unit
      summary: {
        totalWorkouts: workouts.length,
        totalVolumeKg: totalVolumeKg,
        dateRange: { start, end },
        lastWorkoutLabel,
      },
      workouts: sanitizeWorkoutsForAI(workouts),
      aiPrompt:
        "You are a strength coach and training data analyst. Use ONLY the data in this JSON. " +
        "1) Summarize weekly training volume trend and consistency. " +
        "2) Identify any muscle-group imbalances (if muscleGroup is present). " +
        "3) Call out plateaus or regressions. " +
        "4) Give 3 practical focus areas for the next 2 weeks. " +
        "Keep advice realistic and avoid assuming any missing data.",
    };

    const safeStart = start || 'no-data';
    const safeEnd = end || 'no-data';
    downloadJson(`strengthinsight-ai-export_${safeStart}_to_${safeEnd}.json`, exportPayload);
  }, [workouts, unit, totalVolumeKg, lastWorkoutLabel]);

  
  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}</h1>
        <p className="text-slate-400">Here's your strength progression at a glance.</p>
      </header>

            {workouts.length === 0 && (
        <div className="rounded-3xl border border-blue-500/20 bg-blue-600/10 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0">
              <InformationCircleIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-black tracking-widest text-blue-400 uppercase">
                Tip
              </div>
              <div className="text-slate-100 font-bold mt-1">
                To see your insights, upload screenshots for three recent Strength Trainer workouts.
              </div>
              <div className="text-slate-300 text-sm mt-1">
                Head to <span className="font-bold text-slate-100">Upload</span> to add your screenshots.
              </div>
            </div>
          </div>
        </div>
      )}

      <HeroStatsRow
  stats={[
    { label: "Workouts", value: totalWorkouts },
   { label: "Volume", value: `${Math.round(totalVolumeDisplay).toLocaleString()} ${unit}` },
    { label: "Last", value: lastWorkoutLabel },
  ]}
/>

   <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 lg:p-8">
  <div className="flex items-start justify-between gap-4 mb-4">
    <div>
      <h2 className="text-xl font-bold">Weekly Performance Matrix</h2>
      <p className="text-slate-400 text-sm mt-1">
        Export your workouts + insights as JSON to discuss with ChatGPT/Gemini.
      </p>
    </div>

    <button
      onClick={handleExportForAI}
      disabled={workouts.length === 0}
      className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
        workouts.length === 0
          ? 'bg-slate-950/40 text-slate-600 border-slate-800 cursor-not-allowed'
          : 'bg-slate-950 text-blue-400 border-slate-800 hover:border-blue-500/50 hover:text-blue-300'
      }`}
      title={workouts.length === 0 ? 'Upload workouts to enable export' : 'Download AI-ready JSON export'}
    >
      Export for AI (JSON)
    </button>
  </div>

  <WeeklyHeatMap workouts={workouts} />
</section>


    <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <FireIcon className="w-8 h-8 text-orange-500 mb-4" />
          <p className="text-3xl font-bold">{totalWorkouts}</p>
          <p className="text-slate-400 text-sm">Total Workouts</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <BoltIcon className="w-8 h-8 text-blue-500 mb-4" />
          <p className="text-3xl font-bold">{(totalVolumeDisplay / 1000).toFixed(1)}k</p>
          <p className="text-slate-400 text-sm">Total Volume ({unit})</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
          <TrophyIcon className="w-8 h-8 text-yellow-500 mb-4" />
          <p className="text-lg font-bold truncate">{recentWorkout?.exercises?.[0]?.name || 'N/A'}</p>
          <p className="text-slate-400 text-sm">Recent Exercise</p>
        </div>
      </div>

      <InsightsPanel workouts={workouts} />
    </div>
  );
};

export default Dashboard;
