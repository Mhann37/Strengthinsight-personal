import React, { useState, useRef } from 'react';
import { processWorkoutScreenshots } from '../geminiService';
import { useUserSettings } from '../contexts/UserSettingsContext';
import { calcWorkoutVolumeKg, normalizeUnit, fromKg } from '../utils/unit';
import { Workout, Exercise, SetRecord } from '../types';
import {
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  TrashIcon,
  XCircleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  DevicePhoneMobileIcon,
  ChevronLeftIcon,
  LockClosedIcon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other'];

const normalizeGroup = (g: any): string | null => {
  if (!g) return null;
  const s = String(g).trim();
  const match = MUSCLE_GROUPS.find((x) => x.toLowerCase() === s.toLowerCase());
  return match ?? null;
};

// Smart fallback categorizer (same idea as MuscleGroups.tsx)
const inferMuscleGroupFromName = (name: string): string | null => {
  const n = (name || '').toLowerCase();

  // Chest
  if (
    n.includes('bench') ||
    n.includes('chest') ||
    n.includes('fly') ||
    n.includes('pushup') ||
    n.includes('push-up')
  )
    return 'Chest';

  // Back
  if (n.includes('row') || n.includes('pull') || n.includes('lat') || n.includes('chin')) return 'Back';

  // Shoulders
  if (
    n.includes('shoulder') ||
    n.includes('lateral') ||
    n.includes('deltoid') ||
    n.includes('ohp') ||
    (n.includes('press') && (n.includes('shoulder') || n.includes('overhead')))
  )
    return 'Shoulders';

  // Arms
  if (
    n.includes('curl') ||
    n.includes('tricep') ||
    n.includes('bicep') ||
    n.includes('extension') ||
    n.includes('dip')
  )
    return 'Arms';

  // Legs
  if (
    n.includes('squat') ||
    n.includes('leg') ||
    n.includes('lung') ||
    n.includes('calf') ||
    n.includes('deadlift')
  )
    return 'Legs';

  // Core
  if (n.includes('plank') || n.includes('crunch') || n.includes('abs') || n.includes('core')) return 'Core';

  return null;
};

interface UploaderProps {
  onWorkoutsExtracted: (workouts: Workout[]) => Promise<void>;
}

interface FileWithPreview {
  file: File;
  preview: string;
}

type Platform = 'whoop' | 'garmin' | null;

const Uploader: React.FC<UploaderProps> = ({ onWorkoutsExtracted }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingWorkouts, setPendingWorkouts] = useState<Workout[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { settings } = useUserSettings();
  const preferredUnit = settings.unit;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      setError(null);
      setSaveError(null);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFiles((prev) => [
            ...prev,
            {
              file,
              preview: reader.result as string,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
    setSaveError(null);

    try {
      const imagesData = selectedFiles.map((f) => ({
        base64: f.preview,
        timestamp: f.file.lastModified,
      }));

      const raw = await processWorkoutScreenshots(imagesData);

      // 1) Normalize into an array (or null)
      let normalized: any[] | null =
        Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.workouts)
            ? (raw as any).workouts
            : Array.isArray((raw as any)?.extractedWorkouts)
              ? (raw as any).extractedWorkouts
              : Array.isArray((raw as any)?.pendingWorkouts)
                ? (raw as any).pendingWorkouts
                : Array.isArray((raw as any)?.result)
                  ? (raw as any).result
                  : Array.isArray((raw as any)?.data)
                    ? (raw as any).data
                    : Array.isArray((raw as any)?.data?.workouts)
                      ? (raw as any).data.workouts
                      : Array.isArray((raw as any)?.result?.workouts)
                        ? (raw as any).result.workouts
                        : null;

      // 2) If it returned a single workout object, wrap it
      if (!normalized && raw && typeof raw === 'object') {
        const maybeWorkout = raw as any;
        if ((maybeWorkout.workoutDate || maybeWorkout.date) && maybeWorkout.exercises) {
          normalized = [maybeWorkout];
        }
      }

      // 3) HARD GUARD: stop here if not an array
      if (!Array.isArray(normalized)) {
        console.warn('Unexpected AI response shape:', raw);
        throw new Error("We couldn't extract a workout from these screenshots. Try clearer screenshots or fewer images.");
      }

      // 4) Only now is it safe to touch each workout item
      const cleaned = normalized
        .filter(Boolean)
        .map((w: any) => {
          const exercises = Array.isArray(w.exercises) ? w.exercises : [];

          const patchedExercises = exercises.map((ex: any) => {
            // preserve any existing value if it’s valid
            const existing = normalizeGroup(ex?.muscleGroup);

            // try AI distributions first (if present)
            const distTop =
              Array.isArray(ex?.muscleDistributions) && ex.muscleDistributions.length > 0
