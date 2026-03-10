import { Workout } from '../../types';
import { toKg, normalizeUnit } from '../../utils/unit';

// ── Interfaces ────────────────────────────────────────────────

export type ProgressStatus =
  | 'getting_stronger'
  | 'plateauing'
  | 'taking_a_dip'
  | 'not_enough_data';

export interface PRDroughtResult {
  daysSincePR: number;
  prDate: string; // YYYY-MM-DD
  isFirstSession: boolean;
  isToday: boolean;
}

export interface HeatmapDay {
  iso: string;   // YYYY-MM-DD
  count: number; // workouts on this day
}

export interface PlateauResult {
  sessionCount: number;
  suggestedAction: string;
  currentPeakLoadKg: number;
}

export type FocusClassification = 'Strength' | 'Hypertrophy' | 'Endurance' | 'Mixed';

// ── Internal helpers ──────────────────────────────────────────

const isoLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const toIso = (dateStr: string): string =>
  dateStr.length === 10 ? dateStr : isoLocal(new Date(dateStr));

const epley1RM = (weightKg: number, reps: number): number => {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
};

const sessionPeak1RM = (w: Workout, exerciseName: string): number => {
  const ex = w.exercises.find((e) => e.name === exerciseName);
  if (!ex) return 0;
  return ex.sets.reduce((best, s) => {
    const wKg = toKg(Number((s as any).weight) || 0, normalizeUnit((s as any).unit));
    const reps = Number((s as any).reps) || 0;
    return Math.max(best, epley1RM(wKg, reps));
  }, 0);
};

const sessionPeakLoadKg = (w: Workout, exerciseName: string): number => {
  const ex = w.exercises.find((e) => e.name === exerciseName);
  if (!ex) return 0;
  return ex.sets.reduce((max, s) => {
    return Math.max(max, toKg(Number((s as any).weight) || 0, normalizeUnit((s as any).unit)));
  }, 0);
};

// Returns sessions containing the exercise, newest first
const exerciseSessions = (workouts: Workout[], exerciseName: string): Workout[] =>
  workouts
    .filter((w) => w.exercises.some((ex) => ex.name === exerciseName))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

// ── Feature 1 ─────────────────────────────────────────────────
// getExerciseProgressStatus
// Compares average est1RM (or peak load) of last 3 sessions vs prior 3 sessions.
export function getExerciseProgressStatus(
  workouts: Workout[],
  exerciseName: string,
): ProgressStatus {
  const sessions = exerciseSessions(workouts, exerciseName);
  if (sessions.length < 4) return 'not_enough_data';

  const recent = sessions.slice(0, 3);
  const prior = sessions.slice(3, 6);
  if (prior.length === 0) return 'not_enough_data';

  const avgMetric = (arr: Workout[]): number => {
    const vals = arr.map((w) => {
      const est = sessionPeak1RM(w, exerciseName);
      return est > 0 ? est : sessionPeakLoadKg(w, exerciseName);
    }).filter((v) => v > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };

  const recentAvg = avgMetric(recent);
  const priorAvg = avgMetric(prior);
  if (priorAvg === 0) return 'not_enough_data';

  if (recentAvg > priorAvg * 1.02) return 'getting_stronger';
  if (recentAvg < priorAvg * 0.97) return 'taking_a_dip';
  return 'plateauing';
}

// ── Feature 2 ─────────────────────────────────────────────────
// getPRDrought
// Returns days since the all-time peak load was first set.
export function getPRDrought(
  workouts: Workout[],
  exerciseName: string,
): PRDroughtResult | null {
  const sessions = exerciseSessions(workouts, exerciseName);
  if (sessions.length === 0) return null;

  // Iterate chronologically to find when the all-time peak was first hit
  const chronological = [...sessions].reverse();
  let peakLoadKg = 0;
  let prDate = '';

  for (const w of chronological) {
    const load = sessionPeakLoadKg(w, exerciseName);
    if (load > peakLoadKg) {
      peakLoadKg = load;
      prDate = toIso(w.date);
    }
  }

  if (!prDate) return null;

  const todayIso = isoLocal(new Date());
  const prMs = new Date(prDate + 'T00:00:00').getTime();
  const todayMs = new Date(todayIso + 'T00:00:00').getTime();
  const daysSincePR = Math.floor((todayMs - prMs) / 86_400_000);

  return {
    daysSincePR,
    prDate,
    isFirstSession: sessions.length === 1,
    isToday: daysSincePR === 0,
  };
}

// ── Feature 3 ─────────────────────────────────────────────────
// getActivityHeatmapData
// Returns HeatmapDay[] for the last 52 full weeks (Mon–Sun), ending today.
export function getActivityHeatmapData(workouts: Workout[]): HeatmapDay[] {
  const countMap = new Map<string, number>();
  for (const w of workouts) {
    if (!w.date) continue;
    const iso = toIso(w.date);
    countMap.set(iso, (countMap.get(iso) || 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Monday of the week that started 51 complete weeks ago
  // so we get exactly 52 weeks of columns ending on today's column.
  const end = new Date(today);
  // Advance to end of current week (Sunday), then we have 52 weeks back to Monday
  const dowToday = today.getDay(); // 0=Sun, 1=Mon
  // Offset to the Sunday of this week
  const daysToSun = dowToday === 0 ? 0 : 7 - dowToday;
  end.setDate(end.getDate() + daysToSun);

  const start = new Date(end);
  start.setDate(start.getDate() - 52 * 7 + 1); // 52 weeks back, starting Monday

  const days: HeatmapDay[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const iso = isoLocal(cursor);
    days.push({ iso, count: countMap.get(iso) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

// ── Feature 4 ─────────────────────────────────────────────────
// getPlateauDetection
// Returns PlateauResult when peak load variance < 3% AND volume variance < 5%
// across the last 4 sessions. Returns null otherwise.
export function getPlateauDetection(
  workouts: Workout[],
  exerciseName: string,
): PlateauResult | null {
  const sessions = exerciseSessions(workouts, exerciseName);
  if (sessions.length < 4) return null;

  const last4 = sessions.slice(0, 4);

  const peakLoads = last4.map((w) => sessionPeakLoadKg(w, exerciseName));
  const maxLoad = Math.max(...peakLoads);
  const minLoad = Math.min(...peakLoads);
  if (maxLoad === 0) return null;

  const loadVariancePct = (maxLoad - minLoad) / maxLoad;

  const volumes = last4.map((w) => {
    const ex = w.exercises.find((e) => e.name === exerciseName);
    if (!ex) return 0;
    return ex.sets.reduce((sum, s) => {
      const wKg = toKg(Number((s as any).weight) || 0, normalizeUnit((s as any).unit));
      const reps = Number((s as any).reps) || 0;
      return sum + wKg * reps;
    }, 0);
  });
  const maxVol = Math.max(...volumes);
  const minVol = Math.min(...volumes);
  const volVariancePct = maxVol > 0 ? (maxVol - minVol) / maxVol : 0;

  if (loadVariancePct >= 0.03 || volVariancePct >= 0.05) return null;

  const currentPeakLoadKg = peakLoads[0]; // most recent session

  let suggestedAction: string;

  if (currentPeakLoadKg < 20) {
    suggestedAction = 'Add 1–2 reps per set before increasing weight';
  } else {
    // Check if reps declined last session
    const maxReps = (w: Workout): number => {
      const ex = w.exercises.find((e) => e.name === exerciseName);
      if (!ex) return 0;
      return ex.sets.reduce((mx, s) => Math.max(mx, Number((s as any).reps) || 0), 0);
    };
    if (maxReps(last4[0]) < maxReps(last4[1])) {
      suggestedAction = 'Hold current weight and aim to hit your target reps consistently first';
    } else {
      const suggested = Math.round((currentPeakLoadKg * 1.025) / 1.25) * 1.25;
      suggestedAction = `Try ${suggested}kg next session`;
    }
  }

  return { sessionCount: 4, suggestedAction, currentPeakLoadKg };
}

// ── Feature 5 ─────────────────────────────────────────────────
// getSessionFocusClassification
// Classifies a workout session by rep range distribution.
export function getSessionFocusClassification(workout: Workout): FocusClassification {
  let strength = 0;    // 1–5 reps
  let hypertrophy = 0; // 6–12 reps
  let endurance = 0;   // 13+ reps

  for (const ex of workout.exercises) {
    for (const s of ex.sets as any[]) {
      const reps = Number(s.reps) || 0;
      if (reps <= 0) continue;
      // Exclude warm-up sets when set type is available
      if (s.setType === 'warmup' || s.type === 'warmup') continue;
      if (reps <= 5) strength++;
      else if (reps <= 12) hypertrophy++;
      else endurance++;
    }
  }

  const total = strength + hypertrophy + endurance;
  if (total === 0) return 'Mixed';
  if (strength / total >= 0.6) return 'Strength';
  if (hypertrophy / total >= 0.6) return 'Hypertrophy';
  if (endurance / total >= 0.6) return 'Endurance';
  return 'Mixed';
}
