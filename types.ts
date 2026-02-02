
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
}

export type AppView = 'dashboard' | 'upload' | 'history' | 'analytics' | 'export' | 'muscleGroups' | 'settings';
