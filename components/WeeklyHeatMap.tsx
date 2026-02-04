import React, { useRef, useEffect, useState } from 'react';
import { Workout } from '../types';
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon } from '@heroicons/react/24/outline';

interface WeeklyHeatMapProps {
  workouts: Workout[];
}

const WeeklyHeatMap: React.FC<WeeklyHeatMapProps> = ({ workouts }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get the last 5 days
  const today = new Date();
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (4 - i));
    return d;
  });

  // Auto-scroll to the end (today) on mount for better mobile UX
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, []);

  // Group exercises by day
  const exerciseByDay: Record<string, string[]> = {};
  
  days.forEach(day => {
    const dayStr = day.toISOString().split('T')[0];
    exerciseByDay[dayStr] = [];
    
    // Find all workouts on this day
    workouts.forEach(workout => {
      if (!workout.date) return;
      const workoutDayStr = workout.date.split('T')[0];
      if (workoutDayStr === dayStr) {
        workout.exercises.forEach(ex => {
          if (!exerciseByDay[dayStr].includes(ex.name)) {
            exerciseByDay[dayStr].push(ex.name);
          }
        });
      }
    });
  });

  const getDayName = (date: Date) => {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  };

  const getDayNum = (date: Date) => {
    return date.getDate();
  };

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
        {days.map(day => {
          const dayKey = day.toISOString().split('T')[0];
          const exercises = exerciseByDay[dayKey];
          const isToday = dayKey === today.toISOString().split('T')[0];

          return (
            <div 
              key={dayKey} 
              className={`
                ${isZoomed ? 'min-w-[120px]' : 'min-w-[55px] flex-1'} 
                shrink-0 flex flex-col space-y-2 snap-center last:mr-0 transition-all duration-300 ease-in-out
              `}
            >
              <div className={`text-center py-2 rounded-xl border transition-all duration-300 ${isToday ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40' : 'bg-slate-800 border-slate-700'}`}>
                <p className={`${isZoomed ? 'text-xs' : 'text-[9px]'} font-bold uppercase tracking-wider ${isToday ? 'text-white' : 'text-slate-400'}`}>{getDayName(day)}</p>
                <p className={`${isZoomed ? 'text-2xl' : 'text-lg'} font-bold leading-none mt-0.5`}>{getDayNum(day)}</p>
              </div>
              
              <div className="flex-1 space-y-1.5 min-h-[200px]">
                {exercises && exercises.length > 0 ? (
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