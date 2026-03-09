import React, { useState, useMemo } from 'react';
import { BodyweightEntry } from '../../../types';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import { fromKg, toKg } from '../../../utils/unit';
import type { Unit } from '../../../utils/unit';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ScaleIcon, PlusIcon, TrashIcon, PencilSquareIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

// ── Types ─────────────────────────────────────────────────────
interface BodyweightV2Props {
  userId: string;
  entries: BodyweightEntry[];
  onAdd: (weightKg: number, unit: Unit) => Promise<void>;
  onUpdate: (id: string, weightKg: number, unit: Unit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'All';

// ── Helpers ───────────────────────────────────────────────────
const todayISO = (): string => new Date().toISOString().slice(0, 10);

const formatDisplayDate = (iso: string): string => {
  const d = new Date(iso + 'T12:00:00'); // avoid timezone shifts
  return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Custom tooltip ─────────────────────────────────────────────
const BwTooltip: React.FC<{ active?: boolean; payload?: any[]; label?: string; unit: Unit }> = ({
  active, payload, label, unit,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-2xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="font-bold text-white">
        {Number(payload[0]?.value).toFixed(1)} {unit}
      </p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────
const BodyweightV2: React.FC<BodyweightV2Props> = ({ entries, onAdd, onUpdate, onDelete }) => {
  const { settings } = useUserSettings();
  const unit = settings.unit;

  const [inputValue, setInputValue] = useState('');
  const [inputUnit, setInputUnit] = useState<Unit>(unit);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editUnit, setEditUnit] = useState<Unit>(unit);
  const [visibleCount, setVisibleCount] = useState(30);

  // Check if today already has an entry
  const todayEntry = useMemo(() => entries.find((e) => e.date === todayISO()), [entries]);

  // Filter chart entries by time range
  const chartEntries = useMemo(() => {
    const now = new Date();
    const cutoffs: Record<TimeRange, number> = {
      '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'All': Infinity,
    };
    const daysBack = cutoffs[timeRange];
    const cutoff = new Date(now.getTime() - daysBack * 86_400_000);
    return [...entries]
      .filter((e) => new Date(e.date + 'T12:00:00') >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({
        date: new Date(e.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        weight: Math.round(fromKg(e.weight, unit) * 10) / 10,
        rawDate: e.date,
      }));
  }, [entries, timeRange, unit]);

  const handleSave = async () => {
    const val = parseFloat(inputValue);
    if (Number.isNaN(val) || val <= 0 || val > 500) {
      setSaveError('Please enter a valid weight.');
      return;
    }
    const weightKg = toKg(val, inputUnit);
    setSaving(true);
    setSaveError(null);
    try {
      if (todayEntry) {
        await onUpdate(todayEntry.id, weightKg, inputUnit);
      } else {
        await onAdd(weightKg, inputUnit);
      }
      setInputValue('');
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, dateLabel: string) => {
    if (!window.confirm(`Delete bodyweight entry for ${dateLabel}?`)) return;
    await onDelete(id);
  };

  const startEdit = (entry: BodyweightEntry) => {
    setEditingId(entry.id);
    setEditUnit(unit);
    setEditValue(String(Math.round(fromKg(entry.weight, unit) * 10) / 10));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (entry: BodyweightEntry) => {
    const val = parseFloat(editValue);
    if (Number.isNaN(val) || val <= 0 || val > 500) return;
    const weightKg = toKg(val, editUnit);
    try {
      await onUpdate(entry.id, weightKg, editUnit);
      setEditingId(null);
    } catch {}
  };

  const displayEntries = entries.slice(0, visibleCount);
  const hasMore = entries.length > visibleCount;

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mb-1">Measurements</p>
        <h1 className="text-3xl font-bold">Body</h1>
        <p className="text-slate-400 text-sm mt-1">
          Track your bodyweight over time. Used for relative strength benchmarking.
        </p>
      </header>

      {/* Log today's weight */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScaleIcon className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold">
            {todayEntry ? "Today's Weight (Update)" : "Log Today's Weight"}
          </h2>
        </div>

        {todayEntry && (
          <p className="text-sm text-slate-400 mb-4">
            Current:{' '}
            <span className="font-bold text-white">
              {Math.round(fromKg(todayEntry.weight, unit) * 10) / 10} {unit}
            </span>
          </p>
        )}

        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              max="500"
              placeholder={todayEntry ? `Update from ${Math.round(fromKg(todayEntry.weight, unit) * 10) / 10}` : 'e.g. 82.5'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-blue-500 w-full text-lg"
            />
          </div>
          {/* Unit toggle */}
          <div className="flex bg-slate-950 border border-slate-700 rounded-xl p-1 shrink-0">
            {(['kg', 'lbs'] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => setInputUnit(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${inputUnit === u ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
              >
                {u}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !inputValue}
            className="shrink-0 flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <PlusIcon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{todayEntry ? 'Update' : 'Log'}</span>
          </button>
        </div>

        {saveError && (
          <p className="text-sm text-red-400 mt-2">{saveError}</p>
        )}
      </section>

      {/* Progress chart */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Progress</h2>
          <div className="flex gap-1">
            {(['1M', '3M', '6M', '1Y', 'All'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${timeRange === r ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {chartEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <ScaleIcon className="w-8 h-8 text-slate-700 mb-2" />
            <p className="font-medium">No data for this period</p>
            <p className="text-xs text-slate-600 mt-1">Log your weight above to start tracking.</p>
          </div>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartEntries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip content={<BwTooltip unit={unit} />} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={chartEntries.length <= 20 ? { fill: '#3b82f6', r: 3, strokeWidth: 0 } : false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Measurement history */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold mb-4">Weight History</h2>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <ScaleIcon className="w-8 h-8 text-slate-700 mb-2" />
            <p className="font-medium">No entries yet</p>
            <p className="text-xs text-slate-600 mt-1">Log your bodyweight above to get started.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {displayEntries.map((entry) => {
              const isEditing = editingId === entry.id;
              const displayDate = formatDisplayDate(entry.date);
              const displayWeight = Math.round(fromKg(entry.weight, unit) * 10) / 10;

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl border border-slate-800/50 hover:border-slate-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">{displayDate}</p>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(entry);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="bg-slate-950 border border-blue-500 rounded-lg px-2 py-1 text-sm font-mono text-white outline-none w-24"
                          autoFocus
                        />
                        <div className="flex gap-1">
                          {(['kg', 'lbs'] as Unit[]).map((u) => (
                            <button
                              key={u}
                              onClick={() => setEditUnit(u)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${editUnit === u ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="font-bold text-white mt-0.5">{displayWeight} {unit}</p>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => saveEdit(entry)}
                        className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1.5 text-slate-500 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id, displayDate)}
                        className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + 30)}
                className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 border border-dashed border-slate-800 rounded-xl mt-2 transition-colors"
              >
                Show more ({entries.length - visibleCount} remaining)
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default BodyweightV2;
