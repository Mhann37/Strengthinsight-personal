import React, { useMemo, useState } from 'react';
import { Workout } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { fromKg, calcWorkoutVolumeKg } from '../../../utils/unit';
import { ChevronLeftIcon, ChevronRightIcon, FireIcon } from '@heroicons/react/24/outline';

interface CalendarV2Props {
  workouts: Workout[];
}

// ── Helpers ───────────────────────────────────────────────────
// Use local date components — toISOString() returns UTC and causes
// a +/- 1 day shift for users in non-UTC timezones.
const isoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfMonth = (year: number, month: number): Date => new Date(year, month, 1);

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

// Monday-start week day index (0 = Mon, 6 = Sun)
const monDayIndex = (d: Date): number => (d.getDay() + 6) % 7;

const weekKey = (d: Date): string => {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const mon = new Date(d);
  mon.setDate(mon.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return isoDate(mon);
};

// ── Recovery dot color ────────────────────────────────────────
const recoveryDotClass = (score?: number): string => {
  if (score === undefined) return 'bg-blue-500';
  if (score >= 67) return 'bg-emerald-400';
  if (score >= 34) return 'bg-amber-400';
  return 'bg-red-400';
};

// ── Session summary popup ─────────────────────────────────────
interface DaySummary {
  isoDay: string;
  workouts: Workout[];
}

// ── Monthly streak (consecutive weeks in this month with workout) ─
const longestWeekRunInMonth = (workouts: Workout[], year: number, month: number): number => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = new Set<string>();
  for (const w of workouts) {
    const d = new Date(w.date);
    if (d >= firstDay && d <= lastDay) weeks.add(weekKey(d));
  }
  // Sort weeks and find longest consecutive run
  const sorted = Array.from(weeks).sort();
  let maxRun = 0;
  let run = 0;
  let prevWk: Date | null = null;
  for (const wk of sorted) {
    const curr = new Date(wk + 'T12:00:00');
    if (prevWk) {
      const diff = Math.round((curr.getTime() - prevWk.getTime()) / (7 * 86_400_000));
      if (diff === 1) { run++; }
      else { run = 1; }
    } else { run = 1; }
    if (run > maxRun) maxRun = run;
    prevWk = curr;
  }
  return maxRun;
};

// ── Component ─────────────────────────────────────────────────
const CalendarV2: React.FC<CalendarV2Props> = ({ workouts }) => {
  const { settings } = useUserSettings();
  const unit = settings.unit;
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<DaySummary | null>(null);

  // Build workout map: local ISO date → workouts
  // Parse via Date so that full timestamps are bucketed by local calendar day.
  const workoutMap = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      if (!w.date) continue;
      // If date is already a plain YYYY-MM-DD string treat it as local midnight
      // to avoid the UTC-parse shift; otherwise parse normally.
      const d = w.date.length === 10
        ? new Date(`${w.date}T00:00:00`)
        : new Date(w.date);
      if (Number.isNaN(d.getTime())) continue;
      const day = isoDate(d);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(w);
    }
    return map;
  }, [workouts]);

  const navPrev = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else { setMonth((m) => m - 1); }
    setSelectedDay(null);
  };
  const navNext = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else { setMonth((m) => m + 1); }
    setSelectedDay(null);
  };

  // Calendar grid
  const calendarDays = useMemo(() => {
    const first = startOfMonth(year, month);
    const firstDow = monDayIndex(first); // offset blanks
    const numDays = daysInMonth(year, month);
    const days: (null | { dayNum: number; iso: string })[] = [];
    for (let i = 0; i < firstDow; i++) days.push(null);
    for (let d = 1; d <= numDays; d++) {
      const date = new Date(year, month, d);
      days.push({ dayNum: d, iso: isoDate(date) });
    }
    return days;
  }, [year, month]);

  // Monthly stats
  const monthlyStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const sessions = workouts.filter((w) => {
      if (!w.date) return false;
      const d = w.date.length === 10 ? new Date(`${w.date}T00:00:00`) : new Date(w.date);
      if (Number.isNaN(d.getTime())) return false;
      return isoDate(d).startsWith(prefix);
    });
    const totalVol = sessions.reduce((s, w) => s + (w.totalVolume || calcWorkoutVolumeKg(w)), 0);
    return { count: sessions.length, totalVolKg: totalVol };
  }, [workouts, year, month]);

  // Streak (consecutive weeks up to and including current week)
  const streak = useMemo(() => {
    const weekSet = new Set<string>();
    for (const w of workouts) {
      if (!w.date) continue;
      weekSet.add(weekKey(new Date(w.date)));
    }
    let s = 0;
    const cursor = new Date(now);
    const currWk = weekKey(cursor);
    let wkDate = new Date(currWk + 'T12:00:00');
    while (weekSet.has(isoDate(wkDate))) {
      s++;
      wkDate.setDate(wkDate.getDate() - 7);
    }
    return s;
  }, [workouts]);

  // Rest days this week
  const restDaysThisWeek = useMemo(() => {
    const monStr = weekKey(now);
    const mon = new Date(monStr + 'T12:00:00');
    const todayStr = isoDate(now);
    let rest = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const ds = isoDate(d);
      if (ds > todayStr) break;
      if (!workoutMap.has(ds)) rest++;
    }
    return rest;
  }, [workoutMap, now]);

  // Sessions this month
  const sessionsThisMonth = useMemo(() => {
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let count = 0;
    for (const [k] of workoutMap) {
      if (k.startsWith(prefix)) count++;
    }
    return count;
  }, [workoutMap, now]);

  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <header>
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Logs</p>
        <h1 className="text-3xl font-bold">Training History</h1>
        <p className="text-slate-400 text-sm mt-1">Your training consistency at a glance.</p>
      </header>

      {/* Consistency strip */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
          <FireIcon className={`w-5 h-5 ${streak > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Streak</p>
            <p className="font-bold text-white">{streak > 0 ? `${streak} week${streak !== 1 ? 's' : ''}` : '—'}</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Rest days this week</p>
          <p className="font-bold text-white">🌙 {restDaysThisWeek}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3">
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">This month</p>
          <p className="font-bold text-white">📅 {sessionsThisMonth} session{sessionsThisMonth !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Calendar */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={navPrev}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">{monthName}</h2>
          <button
            onClick={navNext}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DOW_LABELS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (!day) return <div key={`blank-${i}`} />;
            const dayWorkouts = workoutMap.get(day.iso) || [];
            const hasWorkout = dayWorkouts.length > 0;
            const isToday = day.iso === isoDate(now);
            const isFuture = day.iso > isoDate(now);
            const recoveryScore = hasWorkout
              ? dayWorkouts.find((w) => w.recoveryScore !== undefined)?.recoveryScore
              : undefined;
            const dotColor = recoveryDotClass(recoveryScore);

            return (
              <button
                key={day.iso}
                disabled={!hasWorkout}
                onClick={() => setSelectedDay({ isoDay: day.iso, workouts: dayWorkouts })}
                className={`relative flex flex-col items-center justify-center aspect-square rounded-xl transition-all ${
                  hasWorkout
                    ? 'hover:bg-slate-800 cursor-pointer'
                    : 'cursor-default'
                } ${isToday ? 'ring-1 ring-blue-500' : ''}`}
              >
                <span className={`text-xs font-medium ${isFuture ? 'text-slate-700' : isToday ? 'text-blue-400' : hasWorkout ? 'text-slate-200' : 'text-slate-500'}`}>
                  {day.dayNum}
                </span>
                {hasWorkout && (
                  <span className={`w-2 h-2 rounded-full mt-0.5 ${dotColor}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-800">
          {[
            { color: 'bg-emerald-400', label: 'Recovery ≥ 67%' },
            { color: 'bg-amber-400', label: '34–66%' },
            { color: 'bg-red-400', label: '< 34%' },
            { color: 'bg-blue-500', label: 'No recovery score' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[10px] text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Day detail popup */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-200">
                {new Date(selectedDay.isoDay + 'T12:00:00').toLocaleDateString(undefined, {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
            </div>
            {selectedDay.workouts.map((w, i) => {
              const volKg = w.totalVolume || calcWorkoutVolumeKg(w);
              const descriptor = w.exercises?.[0]?.name || 'Workout';
              return (
                <div key={i} className="space-y-1.5 text-sm">
                  <p className="font-bold text-slate-200">{descriptor}{w.exercises.length > 1 ? ` + ${w.exercises.length - 1} more` : ''}</p>
                  <p className="text-slate-400">{w.exercises.length} exercise{w.exercises.length !== 1 ? 's' : ''}</p>
                  <p className="text-slate-400">Volume: <span className="text-white font-bold">{Math.round(fromKg(volKg, unit)).toLocaleString()} {unit}</span></p>
                  {w.recoveryScore !== undefined && (
                    <p className="text-slate-400">Recovery: <span className="text-white font-bold">{w.recoveryScore}%</span></p>
                  )}
                  {w.rpe !== undefined && (
                    <p className="text-slate-400">Effort: <span className="text-white font-bold">{w.rpe}/10</span></p>
                  )}
                  {w.notes && <p className="text-slate-400 italic">"{w.notes}"</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month summary bar */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
        <p className="text-sm text-slate-400">
          <span className="font-bold text-slate-200">{monthName}</span>
          {' · '}
          <span className="font-bold text-white">{monthlyStats.count}</span> sessions
          {' · '}
          <span className="font-bold text-white">{Math.round(fromKg(monthlyStats.totalVolKg, unit)).toLocaleString()} {unit}</span> lifted
        </p>
      </section>
    </div>
  );
};

export default CalendarV2;
