import React, { useState, useCallback, useRef } from 'react';
import { Workout } from '../../../types';
import Uploader from '../../../components/Uploader';
import HevyImporter from './HevyImporter';

// ── Types ─────────────────────────────────────────────────────
type ImportSource = 'whoop' | 'hevy';

interface SessionContext {
  recoveryScore?: number;
  rpe?: number;
  notes?: string;
}

interface UploadWrapperV2Props {
  onWorkoutsExtracted: (workouts: Workout[]) => Promise<void>;
  existingWorkouts: Workout[];
}

// ── RPE picker (10 buttons, no accidental selection) ──────────
const RpePicker: React.FC<{
  value?: number;
  onChange: (v: number | undefined) => void;
}> = ({ value, onChange }) => (
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

// ── Session context panel ─────────────────────────────────────
const SessionContextPanel: React.FC<{
  onConfirm: (ctx: SessionContext) => void;
  onSkip: () => void;
}> = ({ onConfirm, onSkip }) => {
  const [recoveryScore, setRecoveryScore] = useState('');
  const [rpe, setRpe] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    const ctx: SessionContext = {};
    const rs = Number(recoveryScore);
    if (recoveryScore !== '' && !Number.isNaN(rs)) ctx.recoveryScore = Math.min(100, Math.max(0, rs));
    if (rpe !== undefined) ctx.rpe = rpe;
    if (notes.trim()) ctx.notes = notes.trim();
    onConfirm(ctx);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-slideUp">
        <div>
          <h2 className="text-xl font-bold">Add Session Context</h2>
          <p className="text-slate-400 text-sm mt-1">All fields optional — skip to save as is.</p>
        </div>

        {/* Recovery score */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">
            WHOOP Recovery today <span className="text-slate-600 normal-case font-normal tracking-normal">/ 100</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            placeholder="e.g. 74"
            value={recoveryScore}
            onChange={(e) => setRecoveryScore(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500 w-full"
          />
          <p className="text-[11px] text-slate-600 mt-1">
            Your recovery % from WHOOP — used to correlate with your lifts over time
          </p>
        </div>

        {/* RPE */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">
            Session Effort{rpe !== undefined ? <span className="text-blue-400 ml-1 normal-case font-bold tracking-normal">{rpe}/10</span> : <span className="text-slate-600 ml-1 normal-case font-normal tracking-normal">— tap to set</span>}
          </label>
          <RpePicker value={rpe} onChange={setRpe} />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-2">Session Notes</label>
          <textarea
            placeholder="Anything worth remembering about today..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 w-full resize-none h-20"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 py-3 border border-slate-700 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-[2] py-3 bg-blue-600 rounded-xl font-bold text-white hover:bg-blue-500 transition-colors"
          >
            Save with Context
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main wrapper ──────────────────────────────────────────────
const UploadWrapperV2: React.FC<UploadWrapperV2Props> = ({ onWorkoutsExtracted, existingWorkouts }) => {
  const [source, setSource] = useState<ImportSource>('whoop');
  const [showContext, setShowContext] = useState(false);
  const [capturedWorkouts, setCapturedWorkouts] = useState<Workout[] | null>(null);

  // Refs to resolve/reject the pending promise held open while context panel shows
  const resolveRef = useRef<null | (() => void)>(null);
  const rejectRef = useRef<null | ((err: any) => void)>(null);

  // Intercept the V1 Uploader's save — hold the Promise open while context panel is shown
  const handleWhoopExtracted = useCallback(async (workouts: Workout[]): Promise<void> => {
    setCapturedWorkouts(workouts);
    setShowContext(true);

    return new Promise<void>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
    });
  }, []);

  const handleContextConfirm = async (ctx: SessionContext) => {
    if (!capturedWorkouts) return;
    const enriched = capturedWorkouts.map((w) => ({
      ...w,
      source: 'whoop' as const,
      ...(ctx.recoveryScore !== undefined ? { recoveryScore: ctx.recoveryScore } : {}),
      ...(ctx.rpe !== undefined ? { rpe: ctx.rpe } : {}),
      ...(ctx.notes ? { notes: ctx.notes } : {}),
    }));

    setShowContext(false);

    try {
      await onWorkoutsExtracted(enriched);
      resolveRef.current?.();
    } catch (err) {
      rejectRef.current?.(err);
    } finally {
      resolveRef.current = null;
      rejectRef.current = null;
      setCapturedWorkouts(null);
    }
  };

  const handleContextSkip = () => handleContextConfirm({});

  const handleHevyExtracted = useCallback(
    (workouts: Workout[]): Promise<void> => onWorkoutsExtracted(workouts),
    [onWorkoutsExtracted]
  );

  return (
    <div className="relative">
      {/* Source toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setSource('whoop')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              source === 'whoop' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            WHOOP Screenshot
          </button>
          <button
            type="button"
            onClick={() => setSource('hevy')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
              source === 'hevy' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Hevy CSV
          </button>
        </div>
      </div>

      {source === 'whoop' ? (
        <Uploader onWorkoutsExtracted={handleWhoopExtracted} />
      ) : (
        <HevyImporter onWorkoutsExtracted={handleHevyExtracted} existingWorkouts={existingWorkouts} />
      )}

      {/* Session context panel — shown while V1 Uploader awaits the intercepted promise */}
      {showContext && (
        <SessionContextPanel onConfirm={handleContextConfirm} onSkip={handleContextSkip} />
      )}
    </div>
  );
};

export default UploadWrapperV2;
