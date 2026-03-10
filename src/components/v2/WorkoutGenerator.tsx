import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BoltIcon } from '@heroicons/react/24/solid';
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import WorkoutCard from './WorkoutCard';
import {
  generateNextWorkout,
  type GeneratedWorkout,
} from '../../services/generateWorkoutService';
import { trackEvent } from '../../../analytics';
import type { Workout } from '../../../types';

type GeneratorState = 'idle' | 'loading' | 'result' | 'saving';

interface LoadingStep {
  label: string;
  state: 'pending' | 'done' | 'active';
}

const LOADING_STEPS: string[] = [
  'Analysing last 5 sessions...',
  'Checking muscle group rotation...',
  'Building your programme...',
];

// ── Loading animation ─────────────────────────────────────────
const LoadingSteps: React.FC<{ activeStep: number }> = ({ activeStep }) => {
  return (
    <div className="space-y-3 text-left">
      {LOADING_STEPS.map((label, i) => {
        const isDone = i < activeStep;
        const isActive = i === activeStep;
        const isPending = i > activeStep;

        return (
          <div
            key={i}
            className="flex items-center gap-3 transition-all duration-500"
            style={{
              opacity: isPending ? 0.3 : 1,
              transform: isPending ? 'translateY(4px)' : 'translateY(0)',
            }}
          >
            {isDone ? (
              <span className="w-5 h-5 flex items-center justify-center text-emerald-400 text-sm font-bold shrink-0">
                ✓
              </span>
            ) : isActive ? (
              <span
                className="w-5 h-5 flex items-center justify-center shrink-0"
                style={{ animation: 'pulse 1.4s ease-in-out infinite' }}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 block" />
              </span>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-slate-700 block" />
              </span>
            )}
            <span
              className={`text-sm font-medium ${
                isDone
                  ? 'text-emerald-400'
                  : isActive
                  ? 'text-slate-100'
                  : 'text-slate-600'
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────
interface WorkoutGeneratorProps {
  workouts: Workout[];
}

const WorkoutGenerator: React.FC<WorkoutGeneratorProps> = ({ workouts }) => {
  const [genState, setGenState] = useState<GeneratorState>('idle');
  const [generated, setGenerated] = useState<GeneratedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [saveLabel, setSaveLabel] = useState<'save' | 'saving' | 'saved'>('save');
  const [cardVisible, setCardVisible] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Derive context from workouts
  const last5 = workouts.slice(0, 5);
  const latestRecovery = last5.find((w) => w.recoveryScore !== undefined)?.recoveryScore;

  const daysSinceLastSession = (() => {
    if (!workouts.length) return undefined;
    const lastDate = new Date(workouts[0].date);
    if (Number.isNaN(lastDate.getTime())) return undefined;
    return Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Animate loading steps while waiting for Gemini
  useEffect(() => {
    if (genState !== 'loading') {
      setActiveStep(0);
      return;
    }
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    timeouts.push(setTimeout(() => setActiveStep(1), 900));
    timeouts.push(setTimeout(() => setActiveStep(2), 1900));
    return () => timeouts.forEach(clearTimeout);
  }, [genState]);

  // Fade-up entrance for the card result
  useEffect(() => {
    if (genState === 'result') {
      const t = setTimeout(() => setCardVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setCardVisible(false);
    }
  }, [genState]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGenerated(null);
    setGenState('loading');
    trackEvent('generate_workout_requested', { workout_count: workouts.length });

    try {
      const result = await generateNextWorkout();
      setGenerated(result);
      setGenState('result');
      trackEvent('generate_workout_success');
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      setError(msg);
      setGenState('idle');
      trackEvent('generate_workout_error', { reason: err?.reasonCode ?? 'UNKNOWN' });
    }
  }, [workouts.length]);

  const handleSaveImage = useCallback(async () => {
    if (!cardRef.current || !generated) return;
    setSaveLabel('saving');
    setGenState('saving');
    trackEvent('generate_workout_save_image');

    try {
      // Dynamically import html2canvas to keep initial bundle lean
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#0f0f0f',
        logging: false,
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `strengthinsight-workout-${dateStr}.png`;

      // Try Web Share API first (mobile: "Save to Photos" / share sheet)
      if (navigator.share && navigator.canShare) {
        try {
          canvas.toBlob(async (blob) => {
            if (!blob) throw new Error('No blob');
            const file = new File([blob], filename, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({ files: [file], title: 'My Next Workout' });
            } else {
              throw new Error('cannot share files');
            }
          }, 'image/png');
        } catch {
          // Fall back to download link
          triggerDownload(canvas, filename);
        }
      } else {
        triggerDownload(canvas, filename);
      }

      setSaveLabel('saved');
      setTimeout(() => {
        setSaveLabel('save');
        setGenState('result');
      }, 2000);
    } catch {
      setSaveLabel('save');
      setGenState('result');
    }
  }, [generated]);

  const triggerDownload = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ── IDLE STATE ────────────────────────────────────────────
  if (genState === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mb-6">
          <BoltIcon className="w-8 h-8 text-blue-400" />
        </div>

        <h1 className="text-2xl font-bold mb-3">Generate Your Next Workout</h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-8">
          AI analyses your last 5 sessions, recovery data,
          and progression across every exercise you've logged
          — then builds the optimal next session.
        </p>

        {error && (
          <div className="mb-6 w-full max-w-xs bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {workouts.length < 3 && (
          <div className="mb-6 w-full max-w-xs bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <p className="text-amber-400 text-sm font-medium">
              Log at least 3 sessions to get personalised recommendations.
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={workouts.length < 3}
          className={`w-full max-w-xs py-4 rounded-2xl text-base font-bold transition-all flex items-center justify-center gap-2 ${
            workouts.length >= 3
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <BoltIcon className="w-5 h-5" />
          Generate My Workout →
        </button>

        <p className="mt-3 text-xs text-slate-600">
          Takes about 10 seconds. Based on your actual training history.
        </p>
      </div>
    );
  }

  // ── LOADING STATE ─────────────────────────────────────────
  if (genState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mb-8">
          <BoltIcon className="w-8 h-8 text-blue-400" style={{ animation: 'pulse 1.4s ease-in-out infinite' }} />
        </div>

        <div className="w-full max-w-xs">
          <LoadingSteps activeStep={activeStep} />
        </div>

        <p className="mt-8 text-xs text-slate-600 text-center">
          Analysing your full training history...
        </p>
      </div>
    );
  }

  // ── RESULT + SAVING STATES ────────────────────────────────
  if ((genState === 'result' || genState === 'saving') && generated) {
    return (
      <div className="flex flex-col items-center px-4 pb-16 animate-fadeIn">
        {/* Page header */}
        <div className="w-full max-w-md mb-6 pt-2">
          <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">
            AI Generated
          </p>
          <h2 className="text-xl font-bold">Your Next Workout</h2>
        </div>

        {/* Workout Card — fades up on mount */}
        <div
          style={{
            transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
            opacity: cardVisible ? 1 : 0,
            transform: cardVisible ? 'translateY(0)' : 'translateY(16px)',
            maxWidth: '390px',
            width: '100%',
          }}
        >
          <WorkoutCard
            ref={cardRef}
            workout={generated}
            recoveryScore={latestRecovery}
            daysSinceLastSession={daysSinceLastSession}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col gap-3 w-full max-w-[390px]">
          {/* Primary: Save Image */}
          <button
            onClick={handleSaveImage}
            disabled={genState === 'saving'}
            className={`w-full py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              saveLabel === 'saved'
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-95'
            } ${genState === 'saving' ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saveLabel === 'saved' ? (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                Saved!
              </>
            ) : saveLabel === 'saving' ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Image'
            )}
          </button>

          {/* Secondary: Regenerate */}
          <button
            onClick={handleGenerate}
            disabled={genState === 'saving'}
            className="w-full py-3.5 rounded-2xl text-sm font-bold border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Regenerate
          </button>
        </div>

        {/* WHOOP tip */}
        <div className="mt-5 w-full max-w-[390px] bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            💡 Save this image, then open{' '}
            <span className="text-white font-semibold">WHOOP Strength Trainer</span>
            {' → '}
            <span className="text-white font-semibold">AI Workout Builder</span> and upload it.
            WHOOP's AI will build the session for you.
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default WorkoutGenerator;
