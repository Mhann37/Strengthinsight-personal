
export interface SetRecord {
  setNumber: number;
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
}

export interface Exercise {
  id: string;
  name: string;
  sets: SetRecord[];
}

export interface Workout {
  id: string;
  date: string; // ISO string
  totalVolume: number;
  exercises: Exercise[];
}

export type AppView = 'dashboard' | 'upload' | 'history' | 'analytics' | 'export';
