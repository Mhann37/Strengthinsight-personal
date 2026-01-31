import React, { useState, useRef } from 'react';
import { processWorkoutScreenshots } from '../geminiService';
import { Workout, Exercise, SetRecord } from '../types';
import { 
  CloudArrowUpIcon, 
  DocumentCheckIcon, 
  ExclamationCircleIcon, 
  SparklesIcon, 
  TrashIcon, 
  XCircleIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  DevicePhoneMobileIcon,
  ChevronLeftIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

interface UploaderProps {
  onWorkoutsExtracted: (workouts: Workout[]) => void;
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
  const [pendingWorkouts, setPendingWorkouts] = useState<Workout[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      setError(null);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFiles(prev => [...prev, {
            file,
            preview: reader.result as string
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const imagesData = selectedFiles.map(f => ({
        base64: f.preview,
        timestamp: f.file.lastModified
      }));
      const extractedWorkouts = await processWorkoutScreenshots(imagesData);
      setPendingWorkouts(extractedWorkouts);
    } catch (err) {
      setError("Failed to extract data. Please ensure the screenshots are clear.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateWorkoutDate = (wIdx: number, newDate: string) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    try {
      updated[wIdx].date = new Date(newDate).toISOString();
      setPendingWorkouts(updated);
    } catch (e) {
      console.warn("Invalid date format entered");
    }
  };

  const handleUpdateExerciseName = (wIdx: number, eIdx: number, newName: string) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    updated[wIdx].exercises[eIdx].name = newName;
    setPendingWorkouts(updated);
  };

  const handleUpdateSet = (wIdx: number, eIdx: number, sIdx: number, field: keyof SetRecord, value: string | number) => {
    if (!pendingWorkouts) return;
    const updated = [...pendingWorkouts];
    const set = updated[wIdx].exercises[eIdx].sets[sIdx];
    (set as any)[field] = field === 'reps' || field === 'weight' ? Number(value) : value;
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
      unit: lastSet?.unit || 'kg'
    });
    setPendingWorkouts(updated);
  };

  const confirmUpload = async () => {
    if (!pendingWorkouts || isSaving) return;
    setIsSaving(true);
    try {
      const finalized = pendingWorkouts.map(w => ({
        ...w,
        totalVolume: w.exercises.reduce((acc, ex) => 
          acc + ex.sets.reduce((sAcc, s) => sAcc + (s.reps * s.weight), 0)
        , 0)
      }));
      await onWorkoutsExtracted(finalized);
      setPendingWorkouts(null);
      setSelectedFiles([]);
      setSelectedPlatform(null);
    } catch (err) {
      alert("Error confirming data. Please try again.");
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

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center space-x-4">
          <ExclamationCircleIcon className="w-6 h-6 text-slate-500 shrink-0" />
          <p className="text-xs text-slate-500 leading-relaxed">
            StrengthInsight uses advanced AI vision to parse platform-specific UI layouts. Selecting the correct platform ensures higher accuracy during extraction.
          </p>
        </div>
      </div>
    );
  }

  if (pendingWorkouts) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
        <header className="text-center">
          <h1 className="text-3xl font-bold mb-2">Verify Data</h1>
          <p className="text-slate-400">Gemini extracted the following. Please amend any errors before saving.</p>
        </header>

        <div className="space-y-12">
          {pendingWorkouts.map((workout, wIdx) => (
            <div key={workout.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="bg-slate-800/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-600/20 p-3 rounded-2xl">
                    <PencilSquareIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block mb-1">Workout Date</label>
                    <input 
                      type="datetime-local" 
                      defaultValue={new Date(workout.date).toISOString().slice(0, 16)}
                      onChange={(e) => handleUpdateWorkoutDate(wIdx, e.target.value)}
                      className="bg-transparent border-b border-slate-700 font-bold text-white outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Total Volume</p>
                  <p className="text-2xl font-mono font-bold text-blue-400">
                    {workout.exercises.reduce((acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + (s.reps * s.weight), 0), 0).toLocaleString()}kg
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {workout.exercises.map((ex, eIdx) => (
                  <div key={eIdx} className="bg-slate-950/50 rounded-2xl border border-slate-800/50 p-5 group/ex">
                    <div className="flex items-center justify-between mb-4">
                      <input 
                        className="bg-transparent text-xl font-bold text-white border-b border-transparent focus:border-blue-500 outline-none w-full mr-4"
                        value={ex.name}
                        onChange={(e) => handleUpdateExerciseName(wIdx, eIdx, e.target.value)}
                      />
                      <button 
                        onClick={() => removeExercise(wIdx, eIdx)}
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-4 text-[10px] uppercase font-bold text-slate-600 tracking-widest px-2">
                        <span>Set</span>
                        <span>Reps</span>
                        <span>Weight</span>
                        <span className="text-right">Actions</span>
                      </div>
                      {ex.sets.map((set, sIdx) => (
                        <div key={sIdx} className="grid grid-cols-4 items-center bg-slate-900/50 rounded-xl px-2 py-2 border border-slate-800/30 group/set">
                          <span className="text-slate-400 font-mono text-sm ml-2">#{sIdx + 1}</span>
                          <input 
                            type="number"
                            value={set.reps}
                            onChange={(e) => handleUpdateSet(wIdx, eIdx, sIdx, 'reps', e.target.value)}
                            className="bg-slate-800 rounded-lg px-2 py-1 text-sm font-mono w-16 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <input 
                              type="number"
                              value={set.weight}
                              onChange={(e) => handleUpdateSet(wIdx, eIdx, sIdx, 'weight', e.target.value)}
                              className="bg-slate-800 rounded-lg px-2 py-1 text-sm font-mono w-20 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-500 uppercase">{set.unit}</span>
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
                      <button 
                        onClick={() => addSet(wIdx, eIdx)}
                        className="w-full py-2 border border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-900/50 transition-all flex items-center justify-center space-x-2 text-xs"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>Add Set</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 flex space-x-4 z-30">
          <button 
            disabled={isSaving}
            onClick={() => setPendingWorkouts(null)}
            className="flex-1 bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            Discard
          </button>
          <button 
            disabled={isSaving}
            onClick={confirmUpload}
            className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <CheckCircleIcon className="w-6 h-6" />
            )}
            <span>{isSaving ? 'Syncing to Cloud...' : 'Confirm & Save Workouts'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <header className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => setSelectedPlatform(null)}
            className="flex items-center space-x-1 text-slate-500 hover:text-blue-500 transition-colors mb-2 text-sm font-bold uppercase tracking-wider"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <span>Change Platform</span>
          </button>
          <h1 className="text-3xl font-bold mb-2">Upload {selectedPlatform === 'whoop' ? 'Whoop' : 'Garmin'} Workouts</h1>
          <p className="text-slate-400">Select screenshots from your Strength Trainer history.</p>
        </div>
        <div className="bg-blue-600/10 px-4 py-2 rounded-2xl border border-blue-500/20">
           <span className="text-blue-500 font-bold text-sm uppercase">{selectedPlatform}</span>
        </div>
      </header>

      <div 
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-[2rem] p-12 transition-all cursor-pointer group flex flex-col items-center justify-center text-center
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {selectedFiles.map((f, i) => (
                <div key={i} className="relative group/thumb aspect-[3/4] rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                  <img src={f.preview} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center hover:border-blue-500 transition-colors">
                <CloudArrowUpIcon className="w-8 h-8 text-slate-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-blue-400">Click zone to add more</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CloudArrowUpIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Select Screenshots</h3>
            <p className="text-slate-500 max-w-xs">Upload your strength session summaries. AI will handle the data entry.</p>
          </>
        )}
      </div>

      <button
        onClick={handleProcess}
        disabled={selectedFiles.length === 0 || isProcessing}
        className={`
          w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-3 transition-all
          ${selectedFiles.length === 0 || isProcessing 
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/30'}
        `}
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Analyzing {selectedFiles.length} {selectedFiles.length === 1 ? 'Screenshot' : 'Screenshots'}...</span>
          </>
        ) : (
          <>
            <SparklesIcon className="w-6 h-6" />
            <span>Process {selectedFiles.length > 0 ? selectedFiles.length : ''} Files</span>
          </>
        )}
      </button>

      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl">
        <h4 className="font-bold flex items-center space-x-2 mb-4 text-slate-300">
          <DocumentCheckIcon className="w-5 h-5" />
          <span>Verification Process</span>
        </h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          Our AI scans for exercise names, rep counts, and load. You'll have a chance to review the structured data before it's added to your long-term history.
        </p>
      </div>
    </div>
  );
};

export default Uploader;
