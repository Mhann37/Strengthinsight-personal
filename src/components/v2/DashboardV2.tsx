import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Workout } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { fromKg, toKg, normalizeUnit, calcWorkoutVolumeKg } from '../../../utils/unit';
import { trackEvent } from '../../../analytics';
import { getSessionFocusClassification, type FocusClassification } from '../../utils/analyticsCalculations';
import WeeklyHeatMap from '../../../components/WeeklyHeatMap';
import InsightsPanel from '../../../components/InsightsPanel';
import ShareCardCanvas from './ShareCardCanvas';
import type { V2View } from './AppShellV2';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend,
} from 'recharts';

import {
  FireIcon,
  BoltIcon,
  TrophyIcon,
  InformationCircleIcon,
  XMarkIcon,
  ShareIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/solid';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

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
  recentWeightsKg: number[];
}

const computePRs = (workouts: Workout[]): PRData[] => {
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
    for (const w of workouts) {
      const ex = w.exercises.find((e) => e.name === name);
      if (!ex) continue;
      const sessionMax = ex.sets.reduce((max, s) => {
        const wKg = toKg(Number((s as any).weight) || 0, normalizeUnit((s as any).unit));
        return Math.max(max, wKg);
      }, 0);
      if (recentWeightsKg.length < 5) recentWeightsKg.push(sessionMax);
      if (sessionMax > maxWeightKg) { maxWeightKg = sessionMax; maxDate = w.date; }
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
  const h = 24; const w = 60;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ── Session descriptor ────────────────────────────────────────
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

// ── AI export helpers ─────────────────────────────────────────
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
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

// ── Volume axis mapping (Feature 8) ──────────────────────────
const VOLUME_AXIS_MAP: Record<string, string> = {
  chest: 'Push', triceps: 'Arms', biceps: 'Arms', back: 'Pull',
  'rear delts': 'Pull', shoulders: 'Shoulders', quads: 'Legs',
  hamstrings: 'Legs', glutes: 'Legs', calves: 'Legs', legs: 'Legs',
  core: 'Core', abs: 'Core',
};

const RADAR_AXES = ['Push', 'Pull', 'Legs', 'Shoulders', 'Arms', 'Core'];

const muscleGroupToAxis = (mg?: string): string | null => {
  if (!mg) return null;
  const lower = mg.toLowerCase();
  for (const [key, axis] of Object.entries(VOLUME_AXIS_MAP)) {
    if (lower === key || lower.includes(key)) return axis;
  }
  return null;
};

const buildRadarData = (workouts: Workout[], prefix: string) => {
  const sums: Record<string, number> = {};
  for (const axis of RADAR_AXES) sums[axis] = 0;
  for (const w of workouts) {
    if (!w.date.startsWith(prefix)) continue;
    for (const ex of w.exercises) {
      const axis = muscleGroupToAxis(ex.muscleGroup);
      if (!axis) continue;
      for (const s of ex.sets as any[]) {
        sums[axis] += (Number(s.reps) || 0) * toKg(Number(s.weight) || 0, normalizeUnit(s.unit));
      }
    }
  }
  return sums;
};

// ── Feature 8: Volume Radar Chart ────────────────────────────
const VolumeRadarCard: React.FC<{ workouts: Workout[]; unit: string }> = ({ workouts, unit }) => {
  const now = new Date();
  const currPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const currWorkouts = workouts.filter((w) => w.date.startsWith(currPrefix));

  if (currWorkouts.length < 4) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Volume Distribution</p>
        <h2 className="text-lg font-bold mb-3">Training Balance</h2>
        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
          <p className="font-medium text-center text-sm">Log 4+ sessions this month to see your volume distribution</p>
        </div>
      </div>
    );
  }

  const currSums = buildRadarData(workouts, currPrefix);
  const prevSums = buildRadarData(workouts, prevPrefix);
  const currTotal = Object.values(currSums).reduce((s, v) => s + v, 0) || 1;
  const prevTotal = Object.values(prevSums).reduce((s, v) => s + v, 0) || 1;

  const data = RADAR_AXES.map((axis) => ({
    axis,
    current: Math.round(fromKg(currSums[axis], unit as any)),
    previous: Math.round(fromKg(prevSums[axis], unit as any)),
  }));

  // Imbalance check: Push vs Pull, and if any axis < 20% of total while another > 2.5× it
  let imbalanceMsg: string | null = null;
  const pushVol = currSums['Push'] || 0;
  const pullVol = currSums['Pull'] || 0;
  if (pullVol > 0 && pushVol / pullVol > 2.5) {
    imbalanceMsg = `⚠️  Push volume is ${(pushVol / pullVol).toFixed(1)}× your pull volume this month — consider adding more rows and pulls.`;
  } else if (pushVol > 0 && pullVol / pushVol > 2.5) {
    imbalanceMsg = `⚠️  Pull volume is ${(pullVol / pushVol).toFixed(1)}× your push volume this month — consider adding more pressing movements.`;
  } else {
    // Check any axis vs total
    for (const axis of RADAR_AXES) {
      const axisVol = currSums[axis] || 0;
      const axisPct = axisVol / currTotal;
      if (axisPct === 0) continue;
      for (const other of RADAR_AXES) {
        if (other === axis) continue;
        const otherVol = currSums[other] || 0;
        if (otherVol > 0 && axisVol / otherVol > 2.5) {
          imbalanceMsg = `⚠️  ${axis} volume is ${(axisVol / otherVol).toFixed(1)}× your ${other} volume this month.`;
          break;
        }
      }
      if (imbalanceMsg) break;
    }
  }

  const currMonthName = now.toLocaleDateString(undefined, { month: 'long' });
  const prevMonthName = prevDate.toLocaleDateString(undefined, { month: 'long' });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Volume Distribution</p>
      <h2 className="text-lg font-bold mb-1">Training Balance</h2>
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 inline-block" />{currMonthName}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-500 inline-block" />{prevMonthName}</span>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: '#64748b', fontSize: 11 }} />
            <Radar name={currMonthName} dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
            <Radar name={prevMonthName} dataKey="previous" stroke="#64748b" fill="#64748b" fillOpacity={0.15} strokeWidth={1.5} strokeDasharray="4 2" />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {imbalanceMsg ? (
        <p className="text-sm text-amber-400 mt-2 leading-relaxed">{imbalanceMsg}</p>
      ) : (
        <p className="text-sm text-emerald-400 mt-2">✓  Volume distribution looks balanced this month.</p>
      )}
    </div>
  );
};

// ── Feature 9: Monthly Training Summary ───────────────────────
const MonthlySummaryCard: React.FC<{ workouts: Workout[]; unit: string }> = ({ workouts, unit }) => {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();

  const currPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const { currWorkouts, prevWorkouts, monthLabel } = useMemo(() => {
    return {
      currWorkouts: workouts.filter((w) => w.date.startsWith(currPrefix)),
      prevWorkouts: workouts.filter((w) => w.date.startsWith(prevPrefix)),
      monthLabel: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    };
  }, [workouts, currPrefix, prevPrefix]);

  const currVolKg = currWorkouts.reduce((s, w) => s + (w.totalVolume || calcWorkoutVolumeKg(w)), 0);

  // New records this month vs before
  const newRecords = useMemo(() => {
    if (currWorkouts.length === 0) return [];
    const beforeWorkouts = workouts.filter((w) => !w.date.startsWith(currPrefix));
    const records: { exercise: string; type: string; value: string; prevValue?: string }[] = [];

    const exercisesThisMonth = new Set<string>();
    currWorkouts.forEach((w) => w.exercises.forEach((ex) => exercisesThisMonth.add(ex.name)));

    for (const exName of exercisesThisMonth) {
      // Peak load before
      let peakBefore = 0;
      for (const w of beforeWorkouts) {
        const ex = w.exercises.find((e) => e.name === exName);
        if (!ex) continue;
        for (const s of ex.sets as any[]) {
          peakBefore = Math.max(peakBefore, toKg(Number(s.weight) || 0, normalizeUnit(s.unit)));
        }
      }
      // Peak load this month
      let peakNow = 0;
      for (const w of currWorkouts) {
        const ex = w.exercises.find((e) => e.name === exName);
        if (!ex) continue;
        for (const s of ex.sets as any[]) {
          peakNow = Math.max(peakNow, toKg(Number(s.weight) || 0, normalizeUnit(s.unit)));
        }
      }
      if (peakNow > peakBefore && peakBefore > 0) {
        records.push({
          exercise: exName,
          type: 'peak load',
          value: `${Math.round(fromKg(peakNow, unit as any))} ${unit}`,
          prevValue: `was ${Math.round(fromKg(peakBefore, unit as any))} ${unit}`,
        });
      }
    }
    return records.slice(0, 5);
  }, [workouts, currWorkouts, currPrefix, unit]);

  // Most trained muscle group axis
  const mostTrainedAxis = useMemo(() => {
    const sums = buildRadarData(workouts, currPrefix);
    const entries = Object.entries(sums).filter(([, v]) => v > 0);
    if (entries.length === 0) return null;
    const [topAxis, topVol] = entries.reduce((best, curr) => curr[1] > best[1] ? curr : best);
    return { axis: topAxis, volKg: topVol };
  }, [workouts, currPrefix]);

  // Biggest volume jump vs prev month
  const biggestJump = useMemo(() => {
    const prevByEx: Record<string, number> = {};
    const currByEx: Record<string, number> = {};
    for (const w of prevWorkouts) {
      for (const ex of w.exercises) {
        const vol = ex.sets.reduce((s, set: any) => s + (Number(set.reps) || 0) * toKg(Number(set.weight) || 0, normalizeUnit(set.unit)), 0);
        prevByEx[ex.name] = (prevByEx[ex.name] || 0) + vol;
      }
    }
    for (const w of currWorkouts) {
      for (const ex of w.exercises) {
        const vol = ex.sets.reduce((s, set: any) => s + (Number(set.reps) || 0) * toKg(Number(set.weight) || 0, normalizeUnit(set.unit)), 0);
        currByEx[ex.name] = (currByEx[ex.name] || 0) + vol;
      }
    }
    let bestEx = '';
    let bestPct = 0;
    for (const [ex, curr] of Object.entries(currByEx)) {
      const prev = prevByEx[ex];
      if (!prev || prev === 0) continue;
      const pct = Math.round(((curr - prev) / prev) * 100);
      if (pct > bestPct) { bestPct = pct; bestEx = ex; }
    }
    return bestEx ? { exercise: bestEx, pct: bestPct } : null;
  }, [currWorkouts, prevWorkouts]);

  // Longest week streak within this month
  const longestRun = useMemo(() => {
    const weeks = new Set<string>();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    for (const w of currWorkouts) {
      const d = new Date(w.date);
      if (d < startOfMonth || d > endOfMonth) continue;
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const mon = new Date(d);
      mon.setDate(mon.getDate() + diff);
      weeks.add(mon.toISOString().slice(0, 10));
    }
    const sorted = Array.from(weeks).sort();
    let maxRun = 0; let run = 0; let prev: Date | null = null;
    for (const wk of sorted) {
      const curr = new Date(wk + 'T12:00:00');
      if (prev) {
        const diffWks = Math.round((curr.getTime() - prev.getTime()) / (7 * 86_400_000));
        run = diffWks === 1 ? run + 1 : 1;
      } else { run = 1; }
      if (run > maxRun) maxRun = run;
      prev = curr;
    }
    return maxRun;
  }, [currWorkouts]);

  if (currWorkouts.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Collapsed header (always shown) */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full px-5 py-4 hover:bg-slate-800/30 transition-colors text-left"
      >
        <p className="text-sm text-slate-400">
          <span className="font-bold text-slate-200">{monthLabel}</span>
          {'  ·  '}
          <span className="font-bold text-white">{currWorkouts.length}</span> sessions
          {'  ·  '}
          <span className="font-bold text-white">{Math.round(fromKg(currVolKg, unit as any)).toLocaleString()} {unit}</span>
          {newRecords.length > 0 && (
            <>{'  ·  '}<span className="font-bold text-amber-400">🏆 {newRecords.length} new record{newRecords.length !== 1 ? 's' : ''}</span></>
          )}
        </p>
        <ChevronDownIcon className={`w-4 h-4 text-slate-500 shrink-0 ml-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800/50">
          <div className="pt-4">
            <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-3">{monthLabel} — Training Summary</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sessions logged', value: currWorkouts.length },
                { label: 'Total volume lifted', value: `${Math.round(fromKg(currVolKg, unit as any)).toLocaleString()} ${unit}` },
                { label: 'New personal records', value: newRecords.length },
                { label: 'Longest run', value: `${longestRun} week${longestRun !== 1 ? 's' : ''}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-950 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">{label}</p>
                  <p className="font-bold text-white mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {newRecords.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">New Records</p>
              <div className="space-y-1">
                {newRecords.map((r, i) => (
                  <p key={i} className="text-sm text-slate-300">
                    ↑ <span className="font-bold">{r.exercise}</span> — new {r.type} <span className="text-emerald-400">{r.value}</span>
                    {r.prevValue && <span className="text-slate-500"> ({r.prevValue})</span>}
                  </p>
                ))}
              </div>
            </div>
          )}

          {(mostTrainedAxis || biggestJump) && (
            <div className="space-y-1">
              {mostTrainedAxis && (
                <p className="text-sm text-slate-400">
                  Most trained area: <span className="font-bold text-slate-200">{mostTrainedAxis.axis}</span>
                  {' — '}{Math.round(fromKg(mostTrainedAxis.volKg, unit as any)).toLocaleString()} {unit}
                </p>
              )}
              {biggestJump && (
                <p className="text-sm text-slate-400">
                  Biggest volume jump: <span className="font-bold text-slate-200">{biggestJump.exercise}</span>
                  {' '}<span className="text-emerald-400">+{biggestJump.pct}%</span> vs prior month
                </p>
              )}
            </div>
          )}

          {/* Feature 5 — Training Focus Classification */}
          {(() => {
            const counts: Record<FocusClassification, number> = { Strength: 0, Hypertrophy: 0, Endurance: 0, Mixed: 0 };
            currWorkouts.forEach((w) => { counts[getSessionFocusClassification(w)]++; });
            const sorted = (Object.entries(counts) as [FocusClassification, number][])
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1]);
            if (sorted.length === 0) return null;
            const allSame = sorted.length === 1;
            return (
              <p className="text-sm text-slate-400">
                {allSame
                  ? <>Focus: <span className="font-bold text-slate-200">{sorted[0][0]}</span></>
                  : <>
                      Primary focus:{' '}
                      {sorted.slice(0, 2).map(([fc, n], i) => (
                        <React.Fragment key={fc}>
                          {i > 0 && <span className="text-slate-600"> / </span>}
                          <span className="font-bold text-slate-200">{fc}</span>
                          <span className="text-slate-500"> ({n})</span>
                        </React.Fragment>
                      ))}
                    </>
                }
              </p>
            );
          })()}
        </div>
      )}
    </div>
  );
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
  const [showShareCard, setShowShareCard] = useState(false);

  const totalVolumeKg = workouts.reduce((acc, w) => acc + (w.totalVolume || 0), 0);
  const totalVolumeDisplay = fromKg(totalVolumeKg, unit);
  const totalWorkouts = workouts.length;
  const firstName = userName ? userName.split(' ')[0] : 'Athlete';

  const streak = useMemo(() => calcStreak(workouts), [workouts]);
  const prs = useMemo(() => computePRs(workouts), [workouts]);

  useEffect(() => { trackEvent('dashboard_viewed'); }, []);

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

  const weeklyVolumes = useMemo(() => {
    const now = new Date();
    const weeks: number[] = new Array(8).fill(0);
    for (const w of workouts) {
      const d = new Date(w.date);
      const weeksAgo = Math.floor((now.getTime() - d.getTime()) / (7 * 86_400_000));
      if (weeksAgo >= 0 && weeksAgo < 8) weeks[7 - weeksAgo] += w.totalVolume || 0;
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
      aiPrompt: "You are a strength coach. Use ONLY data in this JSON. 1) Summarize weekly volume trend. 2) Identify muscle imbalances. 3) Call out plateaus. 4) Give 3 focus areas for next 2 weeks.",
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

      {/* Volume Trend + Streak */}
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

      {/* PR Strip — below Weekly Matrix (Feature 1) */}
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

      {/* Monthly Summary (Feature 9) — directly below PR strip */}
      <MonthlySummaryCard workouts={workouts} unit={unit} />

      {/* Volume Distribution Radar (Feature 8) */}
      {workouts.length > 0 && <VolumeRadarCard workouts={workouts} unit={unit} />}

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
              const hasContext = w.recoveryScore !== undefined || w.rpe !== undefined || w.notes;

              return (
                <div
                  key={w.id || i}
                  className={`px-4 py-3 rounded-2xl bg-slate-950/50 border border-slate-800/40 border-l-[3px] ${borderColor} hover:border-slate-700/60 transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs font-bold w-14 shrink-0">{dateLabel}</span>
                    <span className="flex-1 text-sm font-semibold text-slate-200 truncate min-w-0">{descriptor}</span>
                    <span className="text-xs text-slate-500 shrink-0 hidden sm:block">{exCount} {exCount === 1 ? 'exercise' : 'exercises'}</span>
                    <span className="text-xs text-slate-500 shrink-0 sm:hidden">{exCount}ex</span>
                    <span className="text-xs font-mono font-bold text-blue-400 shrink-0 text-right w-24">{volumeDisplay.toLocaleString()} {unit}</span>
                  </div>
                  {/* Context line (Feature 3) */}
                  {hasContext && (
                    <p className="text-[10px] text-slate-500 italic mt-1 pl-[68px]">
                      {w.recoveryScore !== undefined && `Recovery: ${w.recoveryScore}%`}
                      {w.recoveryScore !== undefined && (w.rpe !== undefined || w.notes) && '  ·  '}
                      {w.rpe !== undefined && `Effort: ${w.rpe}/10`}
                      {w.rpe !== undefined && w.notes && '  ·  '}
                      {w.notes && `"${w.notes}"`}
                    </p>
                  )}
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

      {/* Generate Next Workout CTA */}
      {workouts.length >= 3 && (
        <button
          type="button"
          onClick={() => setView('generate')}
          className="w-full text-left bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/40 hover:bg-slate-800/60 transition-all group active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-600/25 transition-colors">
                <BoltIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200 leading-tight">Next Workout</p>
                <p className="text-xs text-slate-500 mt-0.5">AI-generated from your last 5 sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold shrink-0 group-hover:bg-blue-500 transition-colors">
              Generate
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        </button>
      )}

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
