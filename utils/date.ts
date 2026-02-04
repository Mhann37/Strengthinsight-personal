// utils/date.ts

/** Returns true if the string is exactly YYYY-MM-DD */
export const isYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Parse a workout date safely.
 * - If it's YYYY-MM-DD, interpret as LOCAL midnight (prevents timezone day-shift bugs)
 * - Otherwise fall back to new Date(value) for ISO strings, etc.
 */
export const parseWorkoutDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (isYMD(v)) {
    const [yy, mm, dd] = v.split('-').map((n) => Number(n));
    const d = new Date(yy, (mm || 1) - 1, dd || 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d;
};

/** Format a Date as YYYY-MM-DD in LOCAL time */
export const formatYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
