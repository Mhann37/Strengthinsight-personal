import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, ensureAppCheckToken } from '../../firebase';

const functions = getFunctions(app, 'us-central1');
const generateNextWorkoutFn = httpsCallable(functions, 'generateNextWorkout', { timeout: 90000 });

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: number;
  weight_kg: number;
  progression_note: string;
  progression_direction: 'up' | 'maintain' | 'down' | 'rep_increase';
}

export interface GeneratedWorkout {
  focus: string;
  exercises: GeneratedExercise[];
  estimated_volume_kg: number;
  coach_note: string;
}

export async function generateNextWorkout(): Promise<GeneratedWorkout> {
  await ensureAppCheckToken();

  try {
    const res = await generateNextWorkoutFn({});
    return (res as any).data as GeneratedWorkout;
  } catch (err: any) {
    const rawMsg = String(err?.message ?? '');

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawMsg);
    } catch {
      const jsonStart = rawMsg.indexOf('{');
      const jsonEnd = rawMsg.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
          parsed = JSON.parse(rawMsg.slice(jsonStart, jsonEnd + 1));
        } catch {}
      }
    }

    if (parsed?.requestId && parsed?.reasonCode && parsed?.message) {
      throw { ...parsed, original: err };
    }

    throw {
      ok: false,
      reasonCode: 'UNKNOWN',
      message: err?.message || 'Something went wrong. Please try again.',
      requestId: 'N/A',
      original: err,
    };
  }
}
