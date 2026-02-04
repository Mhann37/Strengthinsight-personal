import React from 'react';
import { Workout } from '../types';
import { FireIcon } from '@heroicons/react/24/solid';
import { parseWorkoutDate, formatYMD } from '../utils/date';

interface WeeklyHeatMapProps {
  workouts: Workout[];
}

const WeeklyHeatMap: React.FC<WeeklyHeatMapProps> = ({ workouts }) => {
  // Create date map for last 7 weeks (49 days)
  const createDateGrid = () => {
    const grid: { date: Date; workouts: number; totalVolume: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from 49 days ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 48);

    // Create 49 days grid
    for (let i = 0; i < 49; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateKey = formatYMD(date); // ✅ local YYYY-MM-DD

      // Count workouts for this date
      const workoutsOnDate = workouts.filter((workout) => {
        const wd = parseWorkoutDate(workout.date);
        if (!wd) return false;
        return formatYMD(wd) === dateKey;
      });

      const totalVolume = workoutsOnDate.reduce((acc, w) => acc + (w.totalVolume || 0), 0);

      grid.push({
        date,
        workouts: workoutsOnDate.length,
        totalVolume,
      });
    }

    return grid;
  };

  const dateGrid = createDateGrid();
  const maxVolume = Math.max(...dateGrid.map((d) => d.totalVolume), 1);

  const getIntensityClass = (volume: number) => {
    const intensity = volume / maxVolume;
    if (volume === 0) return 'bg-slate-800';
    if (intensity < 0.25) return 'bg-blue-600/30';
    if (intensity < 0.5) return 'bg-blue-600/60';
    if (intensity < 0.75) return 'bg-blue-500';
    return 'bg-orange-500';
  };

  const weeks = [];
  for (let i = 0; i < 7; i++) {
    weeks.push(dateGrid.slice(i * 7, (i + 1) * 7));
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <FireIcon className="w-6 h-6 text-orange-500" />
          Training Heatmap
        </h3>
        <div className="text-sm text-slate-400">Last 7 weeks</div>
      </div>

      <div className="flex gap-2 mb-2">
        <div className="w-8"></div>
        {weeks[0]?.map((day, idx) => (
          <div key={idx} className="w-4 text-center text-xs text-slate-500 font-medium">
            {dayLabels[day.date.getDay()]}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex gap-2 items-center">
            <div className="w-8 text-xs text-slate-500 font-medium">
              {week[0]?.date.toLocaleDateString('en-AU', { month: 'short' })}
            </div>

            <div className="flex gap-1">
              {week.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className={`w-4 h-4 rounded-md ${getIntensityClass(day.totalVolume)} hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer group relative`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs whitespace-nowrap">
                      <div className="font-medium text-white">
                        {day.date.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-slate-400">
                        {day.workouts} workout{day.workouts !== 1 ? 's' : ''}
                      </div>
                      <div className="text-slate-400">
                        {(day.totalVolume / 1000).toFixed(1)}t volume
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6 text-xs text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded bg-slate-800"></div>
          <div className="w-3 h-3 rounded bg-blue-600/30"></div>
          <div className="w-3 h-3 rounded bg-blue-600/60"></div>
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <div className="w-3 h-3 rounded bg-orange-500"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

export default WeeklyHeatMap;
