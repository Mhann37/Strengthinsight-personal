import React, { useState } from 'react';
import {
  DevicePhoneMobileIcon,
  CameraIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

type Unit = 'kg' | 'lbs';

interface OnboardingOverlayProps {
  onComplete: (unit: Unit) => void;
}

const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedUnit, setSelectedUnit] = useState<Unit>('kg');

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-blue-500' : s < step ? 'bg-blue-500/50' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="flex justify-center gap-4 items-center text-slate-500">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <DevicePhoneMobileIcon className="w-8 h-8 text-blue-500" />
              </div>
              <ArrowRightIcon className="w-5 h-5" />
              <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <CameraIcon className="w-8 h-8 text-emerald-500" />
              </div>
              <ArrowRightIcon className="w-5 h-5" />
              <div className="p-3 bg-orange-500/10 rounded-2xl">
                <ChartBarIcon className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Welcome to StrengthInsight
              </h1>
              <p className="text-slate-400 mt-3 leading-relaxed">
                The analytics layer your WHOOP Strength Trainer is missing. Upload screenshots, see real progression.
              </p>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              Let's set up your account
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Units */}
        {step === 2 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                How do you track your weights?
              </h1>
              <p className="text-slate-400 mt-3">
                You can change this anytime in Settings.
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              {(['kg', 'lbs'] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setSelectedUnit(u)}
                  className={`flex-1 max-w-[160px] py-8 rounded-2xl border-2 font-bold text-2xl transition-all ${
                    selectedUnit === u
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {u === 'kg' ? 'Metric' : 'Imperial'}
                  <div className="text-sm mt-1 font-normal opacity-60">{u}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Upload prompt */}
        {step === 3 && (
          <div className="text-center space-y-8 animate-fadeIn">
            <div className="inline-flex p-4 bg-emerald-500/10 rounded-3xl">
              <CameraIcon className="w-12 h-12 text-emerald-500" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                You're ready
              </h1>
              <p className="text-slate-400 mt-3 leading-relaxed">
                Upload your first WHOOP Strength Trainer screenshot to see your data come to life.
              </p>
            </div>

            <button
              onClick={() => onComplete(selectedUnit)}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              Upload my first workout
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingOverlay;
