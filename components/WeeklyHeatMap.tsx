import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Workout } from '../types';
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon } from '@heroicons/react/24/outline';

interface WeeklyHeatMapProps {
  workouts: Workout[];
}

// Local (timezone-safe) YYYY-MM-DD
const toLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Workout date can be "YYYY-MM-DD" or ISO string. Handle both safely.
const workoutDayKey = (dateStr?: string) => {
  if (!dateStr) return null;

  // If it's already YYYY-MM-DD, use it directly (avoid Date parsing timezone quirks)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return null;

  return toLocalYMD(dt);
};

const WeeklyHeatMap: React.FC<WeeklyHeatMapProps> = ({ workouts }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Build the last 5 *local* calendar days (midnight anchored)
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (4 - i));
      return d;
    });
  }, []);

  const todayKey = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return toLocalYMD(t);
  }, []);

  // Auto-scroll to the end (today) on mount for better mobile UX
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  // Group exercises by day (LOCAL keys)
  const exerciseByDay: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {};

    // init buckets for visible days
    days.forEach((day) => {
      map[toLocalYMD(day)] = [];
    });

    workouts.forEach((workout) => {
      const key = workoutDayKey(workout.date);
      if (!key) return;
      if (!map[key]) return; // only show within the last 5 days

      workout.exercises?.forEach((ex) => {
        if (!ex?.name) return;
        if (!map[key].includes(ex.name)) map[key].push(ex.name);
      });
    });

    return map;
  }, [days, workouts]);

  const getDayName = (date: Date) => date.toLocaleDateString(undefined, { weekday: 'short' });
  const getDayNum = (date: Date) => date.getDate();

  return (
    <div className="relative">
      {/* Zoom Toggle */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors"
        >
          {isZoomed ? (
            <>
              <MagnifyingGlassMinusIcon className="w-3.5 h-3.5" />
              <span>Zoom Out</span>
            </>
          ) : (
            <>
              <MagnifyingGlassPlusIcon className="w-3.5 h-3.5" />
              <span>Zoom In</span>
            </>
          )}
        </button>
      </div>

      {/* Heatmap Container */}
      <div
        ref={scrollContainerRef}
        className="flex space-x-2 overflow-x-auto pb-4 snap-x scroll-smooth scrollbar-hide touch-pan-x"
      >
        {days.map((day) => {
          const dayKey = toLocalYMD(day);
          const exercises = exerciseByDay[dayKey] || [];
          const isToday = dayKey === todayKey;

          return (
            <div
              key={dayKey}
              className={`
                ${isZoomed ? 'min-w-[120px]' : 'min-w-[55px] flex-1'} 
                shrink-0 flex flex-col space-y-2 snap-center last:mr-0 transition-all duration-300 ease-in-out
              `}
            >
              <div
                className={`text-center py-2 rounded-xl border transition-all duration-300 ${
                  isToday
                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <p
                  className={`${isZoomed ? 'text-xs' : 'text-[9px]'} font-bold uppercase tracking-wider ${
                    isToday ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  {getDayName(day)}
                </p>
                <p className={`${isZoomed ? 'text-2xl' : 'text-lg'} font-bold leading-none mt-0.5`}>
                  {getDayNum(day)}
                </p>
              </div>

              <div className="flex-1 space-y-1.5 min-h-[200px]">
                {exercises.length > 0 ? (
                  exercises.map((name, idx) => (
                    <div
                      key={idx}
                      className={`
                        ${isZoomed ? 'p-2 text-xs' : 'p-1 text-[9px] leading-3'} 
                        bg-blue-500/10 border border-blue-500/20 rounded-lg 
                        font-medium text-blue-300 text-center break-words 
                        hover:bg-blue-500/20 transition-all duration-300
                      `}
                      title={name}
                    >
                      {name}
                    </div>
                  ))
                ) : (
                  <div className="h-full border-2 border-dashed border-slate-800/50 rounded-xl flex items-center justify-center opacity-30">
                    <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyHeatMap;