import React, { useState } from 'react';
import { Workout } from '../types';
import { ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { parseWorkoutDate } from '../utils/date';

const DataExport: React.FC<{ workouts: Workout[] }> = ({ workouts }) => {
  const [exporting, setExporting] = useState(false);

  const exportAsJSON = async () => {
    setExporting(true);
    try {
      const dataStr = JSON.stringify(workouts, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `strengthinsight-data-${new Date().toLocaleDateString('en-CA')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportAsCSV = async () => {
    setExporting(true);
    try {
      const rows: string[] = [];
      rows.push(['Date', 'Exercise', 'MuscleGroup', 'SetNumber', 'Reps', 'Weight', 'Unit'].join(','));

      workouts.forEach((w) => {
        const d = parseWorkoutDate(w.date);
        const dateStr = d ? d.toLocaleDateString('en-CA') : (w.date || '');

        w.exercises.forEach((ex) => {
          ex.sets.forEach((set) => {
            rows.push(
              [
                `"${dateStr}"`,
                `"${(ex.name || '').replace(/"/g, '""')}"`,
                `"${(ex.muscleGroup || '').replace(/"/g, '""')}"`,
                String(set.setNumber ?? ''),
                String(set.reps ?? ''),
                String(set.weight ?? ''),
                `"${(set.unit || '').replace(/"/g, '""')}"`,
              ].join(',')
            );
          });
        });
      });

      const csvStr = rows.join('\n');
      const csvBlob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(csvBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `strengthinsight-data-${new Date().toLocaleDateString('en-CA')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      <header>
        <h1 className="text-3xl font-bold mb-2">Export Data</h1>
        <p className="text-slate-400">Download your training logs for backup or analysis.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={exportAsJSON}
          disabled={exporting}
          className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-left hover:border-blue-500/50 transition-all disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-600/10 rounded-xl">
              <DocumentTextIcon className="w-7 h-7 text-blue-500" />
            </div>
            <ArrowDownTrayIcon className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Export JSON</h3>
          <p className="text-slate-400 text-sm">Full structured backup of all sessions.</p>
        </button>

        <button
          onClick={exportAsCSV}
          disabled={exporting}
          className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 text-left hover:border-blue-500/50 transition-all disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <TableCellsIcon className="w-7 h-7 text-emerald-500" />
            </div>
            <ArrowDownTrayIcon className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Export CSV</h3>
          <p className="text-slate-400 text-sm">Spreadsheet-friendly export (sets-level).</p>
        </button>
      </div>
    </div>
  );
};

export default DataExport;
