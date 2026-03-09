import React, { useMemo, useCallback } from 'react';
import { Workout } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { fromKg, toKg, normalizeUnit, calcWorkoutVolumeKg } from '../../../utils/unit';
import { trackEvent } from '../../../analytics';
import WeeklyHeatMap from '../../../components/WeeklyHeatMap';
import InsightsPanel from '../../../components/InsightsPanel';
import ShareCardCanvas from './ShareCardCanvas';
import type { V2View } from './AppShellV2';

import {
  FireIcon,
  BoltIcon,
  TrophyIcon,
  InformationCircleIcon,
  XMarkIcon,
  ShareIcon,
} from '@heroicons/react/24/solid';

// ── What's New banner ──────────────────────────────────────────
const WHATS_NEW_VERSION = 'v2.0';
const WHATS_NEW_KEY = `si:whats-new-dismissed:${WHATS_NEW_VERSION}`;
const WHATS_NEW_MESSAGE =
  "Welcome to StrengthInsight V2. New: personal records strip, training streaks, estimated 1RM tracking, Hevy CSV import, and a shareable progress card.";

const WhatsNewBanner: React.FC = () => {
  const [dismissed, setDismissed] = React.useState(() => {
    try { return localStorage.getItem(WHATS_NEW_KEY) === '1'; } catch { return false; }
  });
  if (dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(WHATS_NEW_KEY, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <InformationCircleIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-black tracking-widest text-blue-400 uppercase mb-1">What's New in V2</div>
          <p className="text-slate-200 text-sm leading-relaxed">{WHATS_NEW_MESSAGE}</p>
        </div>
        <button onClick={handleDismiss} className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ── PR data structure ─────────────────────────────────────────
interface PRData {
  exercise: string;
  maxWeightKg: number;
  date: string;
  recentWeightsKg: number[]; // last 5 sessions max weights
}

const computePRs = (workouts: Workout[]): PRData[] => {
  // Count frequency and find top 5 exercises
  const freq: Record<string, number> = {};
  for (const w of workouts) {
    for (const ex of w.exercises) {
      freq[ex.name] = (freq[ex.name] || 0) + 1;
    }
  }

  const topExercises = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return topExercises.map((name) => {
    let maxWeightKg = 0;
    let maxDate = '';
    const recentWeightsKg: number[] = [];

    // workouts are newest-first
    for (const w of workouts) {
      const ex = w.exercises.find((e) => e.name === name);
      if (!ex) continue;

      const sessionMax = ex.sets.reduce((max, s) => {
        const wKg = toKg(Number((s as any).weight) || 0, normalizeUnit((s as any).unit));
        return Math.max(max, wKg);
      }, 0);

      if (recentWeightsKg.length < 5) recentWeightsKg.push(sessionMax);

      if (sessionMax > maxWeightKg) {
        maxWeightKg = sessionMax;
        maxDate = w.date;
      }
    }

    return { exercise: name, maxWeightKg, date: maxDate, recentWeightsKg };
  });
};

// ── Mini sparkline ────────────────────────────────────────────
const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const h = 24;
  const w = 60;
  const step = w / (values.length - 1);

  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ── Session descriptor (from V1) ──────────────────────────────
const getSessionDescriptor = (workout: Workout): string => {
  const exercises = workout.exercises || [];
  const counts: Record<string, number> = {};
  for (const ex of exercises) {
    const g = ex.muscleGroup;
    if (g && g !== 'Other') counts[g] = (counts[g] || 0) + 1;
  }
  const total = Object.values(counts).reduce((s, c) => s + c, 0);
  if (total === 0) return exercises[0]?.name || 'Workout';

  const pct = (g: string) => (counts[g] || 0) / total;
  const sumPct = (...gs: string[]) => gs.reduce((s, g) => s + (counts[g] || 0), 0) / total;

  const singleLabels: Record<string, string> = {
    Chest: 'Chest Focus', Back: 'Back Focus', Legs: 'Leg Focus',
    Shoulders: 'Shoulders Focus', Arms: 'Arms Focus', Core: 'Core Focus',
  };
  for (const [g, c] of Object.entries(counts)) {
    if (c / total >= 0.5 && singleLabels[g]) return singleLabels[g];
  }

  const lowerPct = pct('Legs');
  const pushPct = sumPct('Chest', 'Shoulders');
  const pullPct = sumPct('Back', 'Arms');
  const upperPct = sumPct('Chest', 'Back', 'Shoulders', 'Arms', 'Core');

  if (pushPct >= 0.45 && lowerPct < 0.2) return 'Push Focus';
  if (pullPct >= 0.45 && lowerPct < 0.2 && pct('Back') > pct('Chest')) return 'Pull Focus';
  if (upperPct >= 0.25 && lowerPct >= 0.25) return 'Full Body';
  if (lowerPct > upperPct) return 'Lower Body Focus';
  if (upperPct > lowerPct) return 'Upper Body Focus';

  return exercises[0]?.name || 'Workout';
};

// ── Focus color for left-border ───────────────────────────────
const focusBorderColor = (descriptor: string): string => {
  if (descriptor.includes('Push')) return 'border-l-blue-500';
  if (descriptor.includes('Pull')) return 'border-l-emerald-500';
  if (descriptor.includes('Leg') || descriptor.includes('Lower')) return 'border-l-orange-500';
  if (descriptor.includes('Full')) return 'border-l-purple-500';
  if (descriptor.includes('Chest')) return 'border-l-blue-400';
  if (descriptor.includes('Back')) return 'border-l-emerald-400';
  if (descriptor.includes('Shoulder')) return 'border-l-sky-400';
  if (descriptor.includes('Arm')) return 'border-l-pink-400';
  if (descriptor.includes('Core')) return 'border-l-amber-400';
  return 'border-l-slate-600';
};

// ── Streak calculator ─────────────────────────────────────────
const calcStreak = (workouts: Workout[]): number => {
  if (workouts.length === 0) return 0;
  const weekSet = new Set<string>();
  for (const w of workouts) {
    const d = new Date(w.date);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(d);
    mon.setDate(mon.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    weekSet.add(mon.toISOString().slice(0, 10));
  }
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const thisMon = new Date(now);
  thisMon.setDate(thisMon.getDate() + diff);
  thisMon.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(thisMon);
  while (weekSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
};

// ── Sanitize for AI export ────────────────────────────────────
const getWorkoutDate = (w: any): Date | null => {
  const d = w?.date || w?.createdAt || w?.timestamp;
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const sanitizeWorkoutsForAI = (workouts: Workout[]) => {
  return workouts.map((w: any) => {
    const dt = getWorkoutDate(w);
    return {
      date: dt ? dt.toISOString().slice(0, 10) : (w?.date || null),
      exercises: (w?.exercises || []).map((ex: any) => ({
        name: ex?.name || 'Unknown',
        muscleGroup: ex?.muscleGroup || null,
        sets: (ex?.sets || []).map((s: any) => ({
          reps: Number(s?.reps) || 0,
          weightKg: toKg(Number(s?.weight) || 0, normalizeUnit(s?.unit)),
        })),
      })),
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

// ── Dashboard V2 ──────────────────────────────────────────────
interface DashboardV2Props {
  workouts: Workout[];
  userName?: string | null;
  setView: (v: V2View) => void;
}

const DashboardV2: React.FC<DashboardV2Props> = ({ workouts, userName, setView }) => {
  const { settings } = useUserSettings();
  const unit = settings.unit;
  const [showShareCard, setShowShareCard] = React.useState(false);

  const totalVolumeKg = workouts.reduce((acc, w) => acc + (w.totalVolume || 0), 0);
  const totalVolumeDisplay = fromKg(totalVolumeKg, unit);
  const totalWorkouts = workouts.length;
  const firstName = userName ? userName.split(' ')[0] : 'Athlete';

  const streak = useMemo(() => calcStreak(workouts), [workouts]);
  const prs = useMemo(() => computePRs(workouts), [workouts]);

  // Volume trend (this week vs last)
  const volumeTrend = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);
    let thisWeek = 0, lastWeek = 0;
    for (const w of workouts) {
      const d = new Date(w.date);
      const vol = w.totalVolume || calcWorkoutVolumeKg(w);
      if (d >= oneWeekAgo) thisWeek += vol;
      else if (d >= twoWeeksAgo) lastWeek += vol;
    }
    const pct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);
    return { thisWeek, lastWeek, pct, isUp: pct >= 0 };
  }, [workouts]);

  // Weekly volume for share card (last 8 weeks)
  const weeklyVolumes = useMemo(() => {
    const now = new Date();
    const weeks: number[] = new Array(8).fill(0);
    for (const w of workouts) {
      const d = new Date(w.date);
      const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 86_400_000));
      if (weeksAgo >= 0 && weeksAgo < 8) {
        weeks[7 - weeksAgo] += w.totalVolume || 0;
      }
    }
    return weeks;
  }, [workouts]);

  const lastWorkoutLabel = useMemo(() => {
    if (!workouts.length) return '—';
    const d = new Date(workouts[0].date);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [workouts]);

  const handleExportForAI = useCallback(() => {
    trackEvent('ai_export_clicked', { workout_count: workouts.length });
    const dated = workouts.map((w: any) => ({ w, d: getWorkoutDate(w) })).filter((x) => x.d).sort((a, b) => a.d!.getTime() - b.d!.getTime());
    const start = dated.length ? dated[0].d!.toISOString().slice(0, 10) : null;
    const end = dated.length ? dated[dated.length - 1].d!.toISOString().slice(0, 10) : null;

    downloadJson(`strengthinsight-ai-export_${start || 'no-data'}_to_${end || 'no-data'}.json`, {
      exportVersion: '2.0',
      generatedAt: new Date().toISOString(),
      app: 'StrengthInsight',
      unitPreference: unit,
      summary: { totalWorkouts: workouts.length, totalVolumeKg, dateRange: { start, end }, lastWorkoutLabel },
      workouts: sanitizeWorkoutsForAI(workouts),
      aiPrompt:
        "You are a strength coach. Use ONLY data in this JSON. 1) Summarize weekly volume trend. 2) Identify muscle imbalances. 3) Call out plateaus. 4) Give 3 focus areas for next 2 weeks.",
    });
  }, [workouts, unit, totalVolumeKg, lastWorkoutLabel]);

  const recent = useMemo(() => workouts.slice(0, 5), [workouts]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}</h1>
          <p className="text-slate-400">Here's your strength progression at a glance.</p>
        </div>
        {workouts.length >= 3 && (
          <button
            onClick={() => setShowShareCard(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-all"
          >
            <ShareIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Share Progress</span>
          </button>
        )}
      </header>

      <WhatsNewBanner />

      {/* Empty state */}
      {workouts.length === 0 && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-black tracking-widest text-blue-400 uppercase">Get Started</div>
              <div className="text-slate-100 font-bold mt-1">Upload screenshots from three recent Strength Trainer workouts to unlock insights.</div>
              <button onClick={() => setView('upload')} className="mt-3 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
                Upload your first workout →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile hero stats */}
      <div className="grid grid-cols-3 gap-3 md:hidden">
        {[
          { label: 'Workouts', value: totalWorkouts },
          { label: 'Volume', value: `${Math.round(totalVolumeDisplay).toLocaleString()} ${unit}` },
          { label: 'Last', value: lastWorkoutLabel },
        ].map((s) => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{s.label}</div>
            <div className="mt-1 text-lg font-bold leading-tight">{s.value}</div>
          </div>
        ))}
      </div>

      {/* PR Strip */}
      {prs.length > 0 && (
        <section>
          <div className="mb-3">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Personal Records</p>
            <h2 className="text-lg font-bold">Top Lifts</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
            {prs.map((pr) => (
              <div
                key={pr.exercise}
                className="snap-start shrink-0 w-48 bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors"
              >
                <p className="text-sm font-bold text-slate-200 truncate">{pr.exercise}</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">
                  {Math.round(fromKg(pr.maxWeightKg, unit))}
                  <span className="text-sm text-slate-500 ml-1">{unit}</span>
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-slate-500">
                    {pr.date ? new Date(pr.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                  </p>
                  <Sparkline values={pr.recentWeightsKg.slice().reverse()} />
                </div>
              </div>
            ))}
            {prs.length < 3 && (
              <div className="snap-start shrink-0 w-48 border-2 border-dashed border-slate-800 rounded-2xl p-4 flex items-center justify-center">
                <p className="text-xs text-slate-600 text-center">Upload more workouts to unlock</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Volume Trend + Streak (two stat blocks) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 ${volumeTrend.isUp ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Volume vs Last Week</p>
          <p className={`text-3xl font-bold ${volumeTrend.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {volumeTrend.isUp ? '+' : ''}{volumeTrend.pct}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {Math.round(fromKg(volumeTrend.thisWeek, unit) / 1000)}k {unit} this week
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 ${streak > 0 ? 'bg-amber-500' : 'bg-slate-700'}`} />
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Training Streak</p>
          <div className="flex items-center gap-2">
            <FireIcon className={`w-8 h-8 ${streak > 0 ? 'text-amber-500' : 'text-slate-600'}`} />
            <p className="text-3xl font-bold">{streak}</p>
            <p className="text-sm text-slate-500 mt-1">{streak === 1 ? 'week' : 'weeks'}</p>
          </div>
        </div>
      </div>

      {/* Weekly Performance Matrix */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 lg:p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Weekly View</p>
            <h2 className="text-lg font-bold">Weekly Performance Matrix</h2>
            <p className="text-slate-400 text-sm mt-1">See your last training days at a glance.</p>
          </div>
          <button
            onClick={handleExportForAI}
            disabled={workouts.length === 0}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              workouts.length === 0
                ? 'bg-slate-950/40 text-slate-600 border-slate-800 cursor-not-allowed'
                : 'bg-slate-950 text-blue-400 border-slate-800 hover:border-blue-500/50 hover:text-blue-300'
            }`}
          >
            Export for AI
          </button>
        </div>
        <WeeklyHeatMap workouts={workouts} />
      </section>

      {/* Recent Training */}
      {recent.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Recent Sessions</p>
            <h2 className="text-lg font-bold">Recent Training</h2>
            <p className="text-slate-400 text-sm mt-1">Your last 5 logged sessions, grouped by training focus.</p>
          </div>
          <div className="space-y-2">
            {recent.map((w, i) => {
              const dt = w.date ? new Date(w.date) : null;
              const dateLabel = dt && !Number.isNaN(dt.getTime())
                ? dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : '—';
              const descriptor = getSessionDescriptor(w);
              const volumeDisplay = Math.round(fromKg(w.totalVolume || 0, unit));
              const exCount = w.exercises?.length || 0;
              const borderColor = focusBorderColor(descriptor);

              return (
                <div
                  key={w.id || i}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-950/50 border border-slate-800/40 border-l-[3px] ${borderColor} hover:border-slate-700/60 transition-colors`}
                >
                  <span className="text-slate-500 text-xs font-bold w-14 shrink-0">{dateLabel}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-200 truncate min-w-0">{descriptor}</span>
                  <span className="text-xs text-slate-500 shrink-0 hidden sm:block">{exCount} {exCount === 1 ? 'exercise' : 'exercises'}</span>
                  <span className="text-xs text-slate-500 shrink-0 sm:hidden">{exCount}ex</span>
                  <span className="text-xs font-mono font-bold text-blue-400 shrink-0 text-right w-24">{volumeDisplay.toLocaleString()} {unit}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Desktop stat cards */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <FireIcon className="w-8 h-8 text-orange-500 mb-4" />
          <p className="text-3xl font-bold">{totalWorkouts}</p>
          <p className="text-slate-400 text-sm">Total Workouts</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <BoltIcon className="w-8 h-8 text-blue-500 mb-4" />
          <p className="text-3xl font-bold">{(totalVolumeDisplay / 1000).toFixed(1)}k</p>
          <p className="text-slate-400 text-sm">Total Volume ({unit})</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <TrophyIcon className="w-8 h-8 text-yellow-500 mb-4" />
          <p className="text-lg font-bold truncate">{workouts[0]?.exercises?.[0]?.name || 'N/A'}</p>
          <p className="text-slate-400 text-sm">Recent Exercise</p>
        </div>
      </div>

      {/* Coach Insight */}
      <InsightsPanel workouts={workouts} />

      {/* Share Card Modal */}
      {showShareCard && (
        <ShareCardCanvas
          workouts={workouts}
          prs={prs.slice(0, 3)}
          weeklyVolumes={weeklyVolumes}
          totalWorkouts={totalWorkouts}
          totalVolumeKg={totalVolumeKg}
          unit={unit}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
};

export default DashboardV2;
