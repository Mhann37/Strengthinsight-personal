import React, { useState, useMemo, useCallback } from 'react';
import { Workout, Exercise, SetRecord } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { toKg, fromKg } from '../../../utils/unit';
import { trackEvent } from '../../../analytics';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

type Unit = 'kg' | 'lbs';

// ── Muscle group inference ────────────────────────────────────
const inferMuscleGroupFromName = (name: string): string => {
  const n = (name || '').toLowerCase();
  if (n.includes('bench') || n.includes('chest') || n.includes('fly') || n.includes('pushup') || n.includes('push-up')) return 'Chest';
  if (n.includes('row') || n.includes('pull') || n.includes('lat') || n.includes('chin')) return 'Back';
  if (n.includes('shoulder') || n.includes('lateral') || n.includes('deltoid') || n.includes('ohp') || (n.includes('press') && (n.includes('shoulder') || n.includes('overhead')))) return 'Shoulders';
  if (n.includes('curl') || n.includes('tricep') || n.includes('bicep') || n.includes('extension') || n.includes('dip')) return 'Arms';
  if (n.includes('squat') || n.includes('leg') || n.includes('lung') || n.includes('calf') || n.includes('deadlift')) return 'Legs';
  if (n.includes('plank') || n.includes('crunch') || n.includes('abs') || n.includes('core')) return 'Core';
  if (n.includes('press')) return 'Shoulders';
  return 'Other';
};

// ── Simple CSV parser (handles quoted fields) ─────────────────
const parseCSVLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuote = false; }
      } else { current += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { fields.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current.trim());
  return fields;
};

// ── RPE button picker ─────────────────────────────────────────
const RpePicker: React.FC<{ value?: number; onChange: (v: number | undefined) => void }> = ({ value, onChange }) => (
  <div>
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? undefined : n)}
          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all border ${
            value === n
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-blue-500/50 hover:text-white'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
    <div className="flex justify-between text-[10px] text-slate-600 mt-1 px-1">
      <span>cruise control</span>
      <span>everything you had</span>
    </div>
  </div>
);

// ── Types ─────────────────────────────────────────────────────
interface SessionPreview {
  title: string;
  date: string;
  displayDate: string;
  exerciseCount: number;
  setCount: number;
  totalVolumeKg: number;
  workout: Workout;
  selected: boolean;
  status: 'ready' | 'duplicate' | 'saved';
}

interface HevyImporterProps {
  onWorkoutsExtracted: (workouts: Workout[]) => Promise<void>;
  existingWorkouts: Workout[];
}

const HevyImporter: React.FC<HevyImporterProps> = ({ onWorkoutsExtracted, existingWorkouts }) => {
  const { settings } = useUserSettings();
  const [importUnit, setImportUnit] = useState<Unit>(settings.unit as Unit);
  const [sessions, setSessions] = useState<SessionPreview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Session context state (Feature 3)
  const [showContext, setShowContext] = useState(false);
  const [ctxRecovery, setCtxRecovery] = useState('');
  const [ctxRpe, setCtxRpe] = useState<number | undefined>(undefined);
  const [ctxNotes, setCtxNotes] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSessions(null);
    setSavedCount(0);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) throw new Error('CSV is empty or has no data rows.');

        const headers = parseCSVLine(lines[0]);
        const titleIdx = headers.findIndex((h) => h.toLowerCase() === 'title');
        const startIdx = headers.findIndex((h) => h.toLowerCase().includes('start time'));
        const exerciseIdx = headers.findIndex((h) => h.toLowerCase().includes('exercise name'));
        const setOrderIdx = headers.findIndex((h) => h.toLowerCase().includes('set order'));
        // Hevy exports either "Weight" or "Weight (kg)"
        const weightIdx = headers.findIndex((h) => h.toLowerCase().startsWith('weight'));
        const repsIdx = headers.findIndex((h) => h.toLowerCase() === 'reps');
        const rpeColIdx = headers.findIndex((h) => h.toLowerCase() === 'rpe');
        const workoutNotesIdx = headers.findIndex((h) => h.toLowerCase().includes('workout notes'));

        if (exerciseIdx === -1 || repsIdx === -1) {
          throw new Error('CSV is missing required columns (Exercise Name, Reps). Is this a Hevy export?');
        }

        // Group rows by session (Title + Start Time)
        const sessionMap = new Map<string, { title: string; date: string; rows: string[][] }>();
        for (let i = 1; i < lines.length; i++) {
          const fields = parseCSVLine(lines[i]);
          const title = titleIdx >= 0 ? fields[titleIdx] || 'Workout' : 'Workout';
          const start = startIdx >= 0 ? fields[startIdx] || '' : '';
          const key = `${title}||${start}`;
          if (!sessionMap.has(key)) sessionMap.set(key, { title, date: start, rows: [] });
          sessionMap.get(key)!.rows.push(fields);
        }

        const previews: SessionPreview[] = [];

        sessionMap.forEach(({ title, date, rows }) => {
          const exerciseMap = new Map<string, { sets: SetRecord[]; muscleGroup: string }>();
          let sessionRpe: number | undefined;
          let sessionNotes: string | undefined;

          for (const fields of rows) {
            const exerciseName = fields[exerciseIdx] || 'Unknown';
            const setOrder = setOrderIdx >= 0 ? Number(fields[setOrderIdx]) || 1 : 1;
            const rawWeight = weightIdx >= 0 ? Number(fields[weightIdx]) || 0 : 0;
            const reps = Number(fields[repsIdx]) || 0;
            const weightKg = toKg(rawWeight, importUnit);

            // Capture first non-empty RPE from the session rows
            if (sessionRpe === undefined && rpeColIdx >= 0) {
              const rpeVal = Number(fields[rpeColIdx]);
              if (!Number.isNaN(rpeVal) && rpeVal > 0) sessionRpe = Math.min(10, Math.max(1, rpeVal));
            }

            // Capture first non-empty workout notes
            if (!sessionNotes && workoutNotesIdx >= 0 && fields[workoutNotesIdx]?.trim()) {
              sessionNotes = fields[workoutNotesIdx].trim();
            }

            if (!exerciseMap.has(exerciseName)) {
              exerciseMap.set(exerciseName, { sets: [], muscleGroup: inferMuscleGroupFromName(exerciseName) });
            }
            exerciseMap.get(exerciseName)!.sets.push({ setNumber: setOrder, reps, weight: weightKg, unit: 'kg' });
          }

          const exercises: Exercise[] = [];
          exerciseMap.forEach(({ sets, muscleGroup }, name) => {
            exercises.push({
              id: `hevy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name,
              muscleGroup,
              sets,
            });
          });

          const totalVolumeKg = exercises.reduce(
            (acc, ex) => acc + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
            0
          );

          let isoDate = '';
          if (date) {
            const d = new Date(date);
            isoDate = Number.isNaN(d.getTime()) ? date : d.toISOString();
          }

          const displayDate = isoDate
            ? new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Unknown date';

          const isDup = existingWorkouts.some(
            (ew) => ew.date && isoDate && ew.date.slice(0, 16) === isoDate.slice(0, 16)
          );

          const workout: Workout = {
            id: `hevy-import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            date: isoDate,
            totalVolume: totalVolumeKg,
            exercises,
            source: 'hevy',
            ...(sessionRpe !== undefined ? { rpe: sessionRpe } : {}),
            ...(sessionNotes ? { notes: sessionNotes } : {}),
          };

          previews.push({
            title,
            date: isoDate,
            displayDate,
            exerciseCount: exercises.length,
            setCount: exercises.reduce((a, ex) => a + ex.sets.length, 0),
            totalVolumeKg,
            workout,
            selected: !isDup,
            status: isDup ? 'duplicate' : 'ready',
          });
        });

        if (previews.length === 0) throw new Error('No workout sessions found in the CSV.');
        previews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        trackEvent('hevy_import_parsed', { session_count: previews.length });
        setSessions(previews);
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  }, [importUnit, existingWorkouts]);

  const toggleSession = (idx: number) => {
    setSessions((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      if (next[idx].status !== 'duplicate') next[idx].selected = !next[idx].selected;
      return next;
    });
  };

  const selectedCount = sessions?.filter((s) => s.selected && s.status === 'ready').length || 0;

  const handleImport = async () => {
    if (!sessions || saving) return;
    const toImport = sessions.filter((s) => s.selected && s.status === 'ready');
    if (toImport.length === 0) return;

    setSaving(true);
    setError(null);
    let saved = 0;

    // Merge session context into selected workouts
    const ctxPatch: Partial<Workout> = {};
    const rs = Number(ctxRecovery);
    if (ctxRecovery !== '' && !Number.isNaN(rs)) ctxPatch.recoveryScore = Math.min(100, Math.max(0, rs));
    if (ctxRpe !== undefined) ctxPatch.rpe = ctxRpe;
    if (ctxNotes.trim()) ctxPatch.notes = ctxNotes.trim();

    for (const session of toImport) {
      try {
        const workout = { ...session.workout, ...ctxPatch };
        await onWorkoutsExtracted([workout]);
        saved++;
        setSessions((prev) => {
          if (!prev) return prev;
          return prev.map((s) => (s === session ? { ...s, status: 'saved' as const, selected: false } : s));
        });
      } catch (err: any) {
        if (String(err?.message || '').includes('already in your history')) {
          setSessions((prev) => {
            if (!prev) return prev;
            return prev.map((s) => (s === session ? { ...s, status: 'duplicate' as const, selected: false } : s));
          });
        }
      }
    }

    setSavedCount(saved);
    setSaving(false);
    trackEvent('hevy_import_saved', { imported_count: saved });
  };

  const displayUnit = settings.unit;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <header>
        <h1 className="text-3xl font-bold mb-2">Import from Hevy</h1>
        <p className="text-slate-400">Upload your Hevy workout export CSV to import your training history.</p>
        <p className="text-xs text-slate-500 mt-2">In Hevy: go to Profile → Export Workouts → CSV</p>
      </header>

      {!sessions && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 font-medium">Weights in export are:</span>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['kg', 'lbs'] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setImportUnit(u)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${importUnit === u ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-16 cursor-pointer hover:border-slate-600 transition-colors bg-slate-900/50">
            <DocumentTextIcon className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-lg font-bold text-slate-300 mb-1">Select Hevy CSV</p>
            <p className="text-sm text-slate-500">Drop your export file here or click to browse</p>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </label>
        </>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {sessions && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} found · {selectedCount} selected
            </p>
            {savedCount > 0 && <p className="text-sm text-emerald-400 font-bold">{savedCount} imported</p>}
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {sessions.map((session, idx) => (
              <div
                key={idx}
                onClick={() => toggleSession(idx)}
                className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  session.status === 'saved'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : session.status === 'duplicate'
                    ? 'bg-slate-950/50 border-slate-800/40 opacity-50 cursor-not-allowed'
                    : session.selected
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-slate-950/50 border-slate-800/40'
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                  session.status === 'saved' ? 'border-emerald-500 bg-emerald-500' :
                  session.selected ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                }`}>
                  {(session.selected || session.status === 'saved') && (
                    <CheckCircleIcon className="w-3 h-3 text-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-200 truncate">{session.title}</p>
                    {session.status === 'duplicate' && (
                      <span className="text-[9px] font-black bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20 uppercase shrink-0">Already exists</span>
                    )}
                    {session.status === 'saved' && (
                      <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase shrink-0">Imported</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{session.displayDate}</p>
                  {/* Show CSV-parsed context inline */}
                  {(session.workout.rpe !== undefined || session.workout.notes) && (
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {session.workout.rpe !== undefined && `Effort: ${session.workout.rpe}/10`}
                      {session.workout.rpe !== undefined && session.workout.notes && '  ·  '}
                      {session.workout.notes && `"${session.workout.notes.slice(0, 40)}${session.workout.notes.length > 40 ? '…' : ''}"`}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{session.exerciseCount} exercises, {session.setCount} sets</p>
                  <p className="text-xs font-mono font-bold text-blue-400">
                    {Math.round(fromKg(session.totalVolumeKg, displayUnit as any)).toLocaleString()} {displayUnit}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Session Context (Feature 3) */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowContext((v) => !v)}
              className="flex items-center justify-between w-full p-4 text-left hover:bg-slate-800/30 transition-colors"
            >
              <div>
                <p className="text-sm font-bold text-slate-300">Add context to selected sessions</p>
                <p className="text-xs text-slate-500 mt-0.5">Recovery score, effort level, notes — all optional</p>
              </div>
              <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${showContext ? 'rotate-180' : ''}`} />
            </button>

            {showContext && (
              <div className="px-4 pb-4 space-y-4 border-t border-slate-800">
                {/* Recovery */}
                <div className="pt-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">
                    WHOOP Recovery today <span className="text-slate-600 normal-case font-normal tracking-normal">/ 100</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    placeholder="e.g. 74"
                    value={ctxRecovery}
                    onChange={(e) => setCtxRecovery(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500 w-full"
                  />
                </div>

                {/* RPE */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">
                    Override Effort{ctxRpe !== undefined ? <span className="text-blue-400 ml-1 normal-case font-bold tracking-normal">{ctxRpe}/10</span> : <span className="text-slate-600 ml-1 normal-case font-normal tracking-normal">— tap to set</span>}
                  </label>
                  <RpePicker value={ctxRpe} onChange={setCtxRpe} />
                  <p className="text-[10px] text-slate-600 mt-1">Overrides any RPE parsed from the CSV file</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">Add Note</label>
                  <textarea
                    placeholder="Anything worth remembering..."
                    value={ctxNotes}
                    onChange={(e) => setCtxNotes(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 w-full resize-none h-16"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setSessions(null); setError(null); setSavedCount(0); }}
              className="flex-1 py-3 border border-slate-700 rounded-xl font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || saving}
              className={`flex-[2] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                selectedCount === 0 || saving
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="w-5 h-5" />
              )}
              <span>{saving ? 'Importing...' : `Import ${selectedCount} session${selectedCount !== 1 ? 's' : ''}`}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HevyImporter;
