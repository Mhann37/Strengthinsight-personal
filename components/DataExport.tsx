
import React from 'react';
import { Workout } from '../types';
import { ArrowDownTrayIcon, TableCellsIcon } from '@heroicons/react/24/outline';

interface DataExportProps {
  workouts: Workout[];
}

const DataExport: React.FC<DataExportProps> = ({ workouts }) => {
  const downloadCSV = () => {
    // CSV Header
    const headers = ['Date', 'Time', 'Workout ID', 'Exercise Name', 'Set Number', 'Reps', 'Weight', 'Unit', 'Volume (kg)'];
    
    // Flatten data hierarchy into rows
    const rows = workouts.flatMap(w => {
      const dateObj = new Date(w.date);
      const dateStr = dateObj.toLocaleDateString();
      const timeStr = dateObj.toLocaleTimeString();

      return w.exercises.flatMap(ex => 
        ex.sets.map(s => [
          dateStr,
          timeStr,
          w.id,
          `"${ex.name.replace(/"/g, '""')}"`, // Escape quotes in exercise names
          s.setNumber,
          s.reps,
          s.weight,
          s.unit,
          (s.reps * s.weight).toFixed(2) // Calculate set volume
        ])
      );
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `strength_insight_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <header>
        <h1 className="text-3xl font-bold mb-2">Export Data</h1>
        <p className="text-slate-400">Download your complete training history for external analysis.</p>
      </header>
      
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-12 flex flex-col items-center text-center space-y-8">
        <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 border border-blue-500/20">
           <TableCellsIcon className="w-12 h-12" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">CSV Data Export</h3>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
            Generate a detailed CSV file containing every set, rep, and weight you've logged. 
            The file is formatted to be easily readable by Excel, Google Sheets, or other data analysis tools.
          </p>
        </div>
        
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 w-full max-w-sm">
          <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
            <span>Total Sessions</span>
            <span className="text-white font-mono">{workouts.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-slate-400">
             <span>Total Sets</span>
             <span className="text-white font-mono">
               {workouts.reduce((acc, w) => acc + w.exercises.reduce((eAcc, ex) => eAcc + ex.sets.length, 0), 0)}
             </span>
          </div>
        </div>

        <button 
          onClick={downloadCSV}
          disabled={workouts.length === 0}
          className={`
            px-8 py-4 rounded-2xl font-bold flex items-center space-x-3 transition-all transform active:scale-[0.98]
            ${workouts.length === 0 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/30'}
          `}
        >
          <ArrowDownTrayIcon className="w-6 h-6" />
          <span>Download CSV File</span>
        </button>
      </div>
    </div>
  );
};

export default DataExport;
