
export interface SetRecord {
  setNumber: number;
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup?: string; // e.g., 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'
  sets: SetRecord[];
}

export interface Workout {
  id: string;
  userId?: string; // Links workout to specific auth user
  date: string; // ISO string
  totalVolume: number;
  exercises: Exercise[];
  // Optional session context fields
  notes?: string;          // free-text session note
  rpe?: number;            // 1–10 perceived effort
  recoveryScore?: number;  // 0–100 manually entered WHOOP recovery %
  source?: 'whoop' | 'hevy' | 'manual';
}

export interface BodyweightEntry {
  id: string;
  userId: string;
  date: string;        // ISO format YYYY-MM-DD, one entry per calendar day
  weight: number;      // canonical KG
  unit: 'kg' | 'lbs'; // user's preferred unit at time of entry
  createdAt: string;
}

export type AppView = 'dashboard' | 'upload' | 'history' | 'analytics' | 'export' | 'muscleGroups';
