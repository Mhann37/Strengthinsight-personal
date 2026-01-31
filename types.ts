
export interface SetRecord {
  setNumber: number;
  reps: number;
  weight: number;
  unit: 'kg' | 'lbs';
}

export interface MuscleDistribution {
  group: string; // 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'
  factor: number; // 0.0 to 1.0 representing the intensity of load on this group
}

export interface Exercise {
  id: string;
  name: string;
  muscleDistributions: MuscleDistribution[];
  sets: SetRecord[];
}

export interface Workout {
  id: string;
  date: string; // ISO string
  totalVolume: number;
  exercises: Exercise[];
}

export type AppView = 'dashboard' | 'upload' | 'history' | 'analytics' | 'export' | 'muscleGroups';
