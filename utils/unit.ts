import type { Workout, Exercise, SetRecord } from '../types';

export type Unit = 'kg' | 'lbs';

// Exact definition: 1 lb = 0.45359237 kg
const KG_PER_LB = 0.45359237;

export const normalizeUnit = (u: any): Unit => {
  const s = String(u ?? '').trim().toLowerCase();
  if (s === 'lb' || s === 'lbs' || s === 'pound' || s === 'pounds') return 'lbs';
  return 'kg';
};

export const toKg = (weight: number, unit: any): number => {
  const w = Number(weight) || 0;
  return normalizeUnit(unit) === 'lbs' ? w * KG_PER_LB : w;
};

export const fromKg = (kg: number, unit: Unit): number => {
  const v = Number(kg) || 0;
  return unit === 'lbs' ? v / KG_PER_LB : v;
};

export const inferDefaultUnitFromBrowser = (): Unit => {
  try {
    const lang = (navigator?.language || '').toLowerCase();
    // Rough heuristic: US -> imperial, otherwise metric
    return lang.includes('en-us') ? 'lbs' : 'kg';
  } catch {
    return 'kg';
  }
};

export const calcSetVolumeKg = (set: SetRecord): number => {
  const reps = Number((set as any)?.reps) || 0;
  const weight = Number((set as any)?.weight) || 0;
  const unit = (set as any)?.unit;
  return reps * toKg(weight, unit);
};

export const calcExerciseVolumeKg = (ex: Exercise): number => {
  const sets = Array.isArray((ex as any)?.sets) ? (ex as any).sets : [];
  return sets.reduce((acc: number, s: any) => acc + calcSetVolumeKg(s), 0);
};

export const calcWorkoutVolumeKg = (w: Workout): number => {
  const exercises = Array.isArray((w as any)?.exercises) ? (w as any).exercises : [];
  return exercises.reduce((acc: number, ex: any) => acc + calcExerciseVolumeKg(ex), 0);
};
