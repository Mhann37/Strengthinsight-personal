import React, { useState, useRef } from 'react';
import { processWorkoutScreenshots } from '../geminiService';
import { useUserSettings } from '../contexts/UserSettingsContext';
import { calcWorkoutVolumeKg, normalizeUnit, fromKg } from '../utils/unit';
import type { Unit } from '../utils/unit';
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
  const [uploadUnitOverride, setUploadUnitOverride] = useState<Unit | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { settings } = useUserSettings();
  const preferredUnit = settings.unit;

  const effectiveUploadUnit: Unit = uploadUnitOverride ?? preferredUnit;

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

  const applyUnitOverrideToPending = (nextUnit: Unit) => {
    if (!pendingWorkouts) return;

    const updated = pendingWorkouts.map((w) => ({
      ...w,
      exercises: (w.exercises || []).map((ex) => ({
        ...ex,
        sets: (ex.sets || []).map((s: any) => ({
          ...s,
          unit: normalizeUnit(nextUnit),
        })),
      })),
    }));

    setPendingWorkouts(updated);
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
        throw new Error(
          "We couldn't extract a workout from these screenshots. Try clearer screenshots or fewer images."
        );
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
                ? ex.muscleDistributions
                    .slice()
                    .sort((a: any, b: any) => (b?.factor ?? 0) - (a?.factor ?? 0))[0]
                : null;

            const fromDist = normalizeGroup(distTop?.group);

            // fallback: infer from name
            const fromName = inferMuscleGroupFromName(ex?.name);

            // ✅ Phase 1: normalize sets (numeric coercion + unit normalization)
            // IMPORTANT: use effectiveUploadUnit so US users can override per upload even if their global setting is kg.
            const sets = Array.isArray(ex?.sets)
              ? ex.sets.map((s: any, idx: number) => ({
                  ...s,
                  setNumber: s?.setNumber ?? idx + 1,
                  reps: Number(s?.reps ?? 0),
                  weight: Number(s?.weight ?? 0),
                  unit: normalizeUnit(s?.unit ?? effectiveUploadUnit),
                }))
              : [];

            return {
              ...ex,
              sets,
              // ✅ default to Other so it feels "auto-detected" and stays consistent for analytics
              muscleGroup: existing ?? fromDist ?? fromName ?? 'Other',
            };
          });

          const workout: Workout = {
            ...w,
            aiDate: w.date ?? w.workoutDate,
            date: '', // user selects
            exercises: patchedExercises,
          };

          return workout;
        });

      if (cleaned.length === 0) {
        console.warn('Normalized workouts empty:', normalized);
        throw new Error('No workouts detected. Please try clearer screenshots.');
      }

      setPendingWorkouts(cleaned as any);
    } catch (err: any) {
      console.error(err);
      let msg = 'Failed to extract data. Please ensure the screenshots are clear.';

      if (err?.message) {
        if (err.message.includes('Access Denied')) {
          msg = 'Access Denied. You may need to be added to the beta tester list.';
        } else if (err.message.includes('Service Busy')) {
          msg = 'System is busy. Please wait a moment and try again.';
        } else if (err.message.includes('Validation Error')) {
          msg = err.message;
        } else {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateWorkoutDate = (wIdx: number, newDate: string) => {
    if (!pendingWorkouts) return;
    setSaveError(null);
    const updated = [...pendingWorkouts];
    updated[wIdx].date = newDate;
    setPendingWorkouts(updated);
  };

  const handleUpdateExerciseField = (wIdx: number, eIdx: number, field: keyof Exercise, value: string) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    (updated[wIdx].exercises[eIdx] as any)[field] = value;
    setPendingWorkouts(updated);
  };

  const handleUpdateSet = (
    wIdx: number,
    eIdx: number,
    sIdx: number,
    field: keyof SetRecord,
    value: string | number
  ) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    const set = updated[wIdx].exercises[eIdx].sets[sIdx];

    if (field === 'reps' || field === 'weight') {
      (set as any)[field] = Number(value);
    } else if (field === 'unit') {
      (set as any)[field] = normalizeUnit(value);
    } else {
      (set as any)[field] = value;
    }

    setPendingWorkouts(updated);
  };

  const removeExercise = (wIdx: number, eIdx: number) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    updated[wIdx].exercises.splice(eIdx, 1);
    setPendingWorkouts(updated);
  };

  const removeSet = (wIdx: number, eIdx: number, sIdx: number) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    updated[wIdx].exercises[eIdx].sets.splice(sIdx, 1);
    setPendingWorkouts(updated);
  };

  const addSet = (wIdx: number, eIdx: number) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    const sets = updated[wIdx].exercises[eIdx].sets;
    const lastSet = sets[sets.length - 1];

    sets.push({
      setNumber: sets.length + 1,
      reps: lastSet?.reps || 10,
      weight: lastSet?.weight || 0,
      unit: normalizeUnit(lastSet?.unit ?? effectiveUploadUnit),
    });

    setPendingWorkouts(updated);
  };

  const confirmUpload = async () => {
    if (!pendingWorkouts || isSaving) return;

    const missingDate = pendingWorkouts.some((w) => !w.date);
    if (missingDate) {
      setSaveError('Please select a session date before logging.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const finalized = pendingWorkouts.map((w) => ({
        ...w,
        totalVolume: calcWorkoutVolumeKg(w),
      }));

      await onWorkoutsExtracted(finalized);

      setPendingWorkouts(null);
      setSelectedFiles([]);
      setSelectedPlatform(null);
      setUploadUnitOverride(null);
    } catch (err: any) {
      console.error('Confirmation Error:', err);
      setSaveError(err.message || 'An unexpected error occurred while saving your data.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedPlatform) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn py-12">
        <header className="text-center space-y-4">
          <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl text-blue-500 mb-2">
            <DevicePhoneMobileIcon className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">Select Platform</h1>
          <p className="text-slate-400 text-lg max-w-lg mx-auto">
            Choose the companion app you use to track your strength training screenshots.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            onClick={() => setSelectedPlatform('whoop')}
            className="group relative bg-slate-900 border-2 border-slate-800 p-8 rounded-[2.5rem] text-left transition-all hover:border-blue-500/50 hover:bg-slate-800/50 hover:shadow-2xl hover:shadow-blue-500/10 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center font-black text-blue-500 text-2xl group-hover:scale-110 transition-transform">
                W
              </div>
              <SparklesIcon className="w-6 h-6 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Whoop</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Fully supported. Analyzes Strength Trainer screenshots for reps, sets, and muscle strain.
            </p>
          </button>

          <div className="relative bg-slate-900/40 border-2 border-slate-800/50 p-8 rounded-[2.5rem] text-left opacity-60 cursor-not-allowed overflow-hidden">
            <div className="absolute top-4 right-4 bg-slate-800 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-slate-700">
              Coming Soon
            </div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-600 text-2xl">
                G
              </div>
              <LockClosedIcon className="w-6 h-6 text-slate-700" />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-slate-500">Garmin</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Garmin Connect support is in development. Follow us for updates on integration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (pendingWorkouts) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
        <header className="text-center space-y-3">
          <h1 className="text-3xl font-bold">Verify Extraction</h1>
          <p className="text-slate-400">Please audit the muscle group mapping and session data.</p>

          {/* ✅ Per-upload override */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">
              This upload uses
            </span>
            <select
              value={effectiveUploadUnit}
              onChange={(e) => {
                const next = normalizeUnit(e.target.value) as Unit;
                setUploadUnitOverride(next);
                applyUnitOverrideToPending(next);
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm font-black text-blue-400 outline-none focus:border-blue-500 transition-all"
            >
              <option value="kg">kg (Metric)</option>
              <option value="lbs">lbs (Imperial)</option>
            </select>
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              (Override)
            </span>
          </div>
        </header>

        <div className="space-y-12">
          {pendingWorkouts.map((workout, wIdx) => (
            <div
              key={(workout as any).id ?? `${wIdx}`}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-slate-800/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-600/20 p-3 rounded-2xl">
                    <PencilSquareIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-1">
                      Session Date
                    </label>
                    <input
                      type="date"
                      value={workout.date ?? ''}
                      onChange={(e) => handleUpdateWorkoutDate(wIdx, e.target.value)}
                      className="bg-transparent border-b border-slate-700 font-bold text-white outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">
                    Calculated Tonnage
                  </p>
                  <p className="text-2xl font-mono font-bold text-blue-400">
                    {Math.round(fromKg(calcWorkoutVolumeKg(workout), preferredUnit)).toLocaleString()}
                    {preferredUnit}
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {workout.exercises.map((ex, eIdx) => (
                  <div
                    key={eIdx}
                    className="bg-slate-950/50 rounded-[2rem] border border-slate-800/50 p-6 group/ex"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-2">
                          Exercise Name
                        </label>
                        <input
                          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 w-full font-bold text-white outline-none focus:border-blue-500 transition-all"
                          value={ex.name}
                          onChange={(e) => handleUpdateExerciseField(wIdx, eIdx, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-2">
                          Muscle Group
                        </label>
                        <div className="relative">
                          <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                          <select
                            className="bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 w-full font-bold text-blue-400 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                            value={ex.muscleGroup || ''}
                            onChange={(e) => handleUpdateExerciseField(wIdx, eIdx, 'muscleGroup', e.target.value)}
                          >
                            <option value="">Select Group...</option>
                            {MUSCLE_GROUPS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest px-2">
                        <span>Set</span>
                        <span>Reps</span>
                        <span>Weight</span>
                        <span className="text-right">Remove</span>
                      </div>
                      {ex.sets.map((set, sIdx) => (
                        <div
                          key={sIdx}
                          className="grid grid-cols-4 items-center bg-slate-900/50 rounded-xl px-2 py-2 border border-slate-800/30 group/set"
                        >
                          <span className="text-slate-400 font-mono text-sm ml-2">#{sIdx + 1}</span>
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) => handleUpdateSet(wIdx, eIdx, sIdx, 'reps', e.target.value)}
                            className="bg-slate-800 rounded-lg px-2 py-1 text-sm font-mono w-16 outline-none focus:ring-1 focus:ring-blue-500 text-white"
                          />
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={set.weight}
                              onChange={(e) => handleUpdateSet(wIdx, eIdx, sIdx, 'weight', e.target.value)}
                              className="bg-slate-800 rounded-lg px-2 py-1 text-sm font-mono w-20 outline-none focus:ring-1 focus:ring-blue-500 text-white"
                            />
                            <span className="text-[10px] text-slate-500 uppercase font-bold">
                              {normalizeUnit((set as any).unit)}
                            </span>
                          </div>
                          <div className="text-right">
                            <button
                              onClick={() => removeSet(wIdx, eIdx, sIdx)}
                              className="p-1.5 text-slate-700 hover:text-red-400 transition-colors"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button
                          onClick={() => addSet(wIdx, eIdx)}
                          className="flex-1 py-3 border border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-900/50 transition-all flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-widest"
                        >
                          <PlusIcon className="w-4 h-4" />
                          <span>Add Set</span>
                        </button>
                        <button
                          onClick={() => removeExercise(wIdx, eIdx)}
                          className="px-4 py-3 border border-slate-800 rounded-xl text-slate-600 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {saveError && (
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40">
            <div className="p-4 bg-red-950/90 border border-red-500/50 rounded-2xl flex items-center space-x-3 text-red-400 shadow-[0_0_50px_rgba(239,68,68,0.3)] backdrop-blur-xl animate-[shake_0.5s_ease-in-out_infinite]">
              <ExclamationCircleIcon className="w-6 h-6 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-tighter mb-0.5">Save Failed</p>
                <p className="text-sm font-bold">{saveError}</p>
              </div>
              <button
                onClick={() => setSaveError(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 flex space-x-4 z-30">
          <button
            disabled={isSaving}
            onClick={() => setPendingWorkouts(null)}
            className="flex-1 bg-slate-800 text-white py-4 rounded-[1.5rem] font-bold hover:bg-slate-700 transition-all disabled:opacity-50 border border-slate-700"
          >
            Discard
          </button>
          <button
            disabled={isSaving || pendingWorkouts.some((w) => !w.date)}
            onClick={confirmUpload}
            className="flex-[2] bg-blue-600 text-white py-4 rounded-[1.5rem] font-bold shadow-2xl shadow-blue-900/40 hover:bg-blue-500 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <CheckCircleIcon className="w-6 h-6" />
            )}
            <span>{isSaving ? 'Syncing...' : 'Log Session Data'}</span>
          </button>
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(-50%) rotate(0deg); }
            25% { transform: translateX(-51%) rotate(-1deg); }
            75% { transform: translateX(-49%) rotate(1deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <header className="flex items-center justify-between">
        <div>
          <button
            disabled={isProcessing || isSaving}
            onClick={() => setSelectedPlatform(null)}
            className="flex items-center space-x-1 text-slate-500 hover:text-blue-500 transition-colors mb-2 text-sm font-bold uppercase tracking-wider"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Change Platform</span>
          </button>

          <h1 className="text-3xl font-bold mb-2">Analysis Hub</h1>
          <p className="text-slate-400">Upload your Strength Trainer summaries to begin.</p>
        </div>
      </header>

      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-[2.5rem] p-16 transition-all cursor-pointer group flex flex-col items-center justify-center text-center
          ${selectedFiles.length > 0 ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 hover:border-slate-600 bg-slate-900/50'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />

        {selectedFiles.length > 0 ? (
          <div className="w-full space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {selectedFiles.map((f, i) => (
                <div
                  key={i}
                  className="relative group/thumb aspect-[3/4] rounded-2xl overflow-hidden border border-slate-700 shadow-xl"
                >
                  <img src={f.preview} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center hover:border-blue-500 transition-colors">
                <CloudArrowUpIcon className="w-10 h-10 text-slate-700" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="w-24 h-24 bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all duration-500 text-slate-500">
              <CloudArrowUpIcon className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Select Screenshots</h3>
            <p className="text-slate-500 max-w-xs">Drop your Whoop Strength summaries here for AI vision analysis.</p>
          </>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-3 text-red-400 animate-pulse">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <button
        onClick={handleProcess}
        disabled={selectedFiles.length === 0 || isProcessing}
        className={`
          w-full py-5 rounded-[1.5rem] font-bold text-lg flex items-center justify-center space-x-3 transition-all
          ${selectedFiles.length === 0 || isProcessing
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-2xl shadow-blue-900/30'}
        `}
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Analyzing UI Components...</span>
          </>
        ) : (
          <>
            <SparklesIcon className="w-6 h-6" />
            <span>Start Extraction</span>
          </>
        )}
      </button>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          25% { transform: translateX(-51%) rotate(-1deg); }
          75% { transform: translateX(-49%) rotate(1deg); }
        }
      `}</style>
    </div>
  );
};

export default Uploader;
