
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, Workout } from './types';
import Dashboard from './components/Dashboard';
import Uploader from './components/Uploader';
import History from './components/History';
import Analytics from './components/Analytics';
import DataExport from './components/DataExport';
import { 
  ChartBarIcon, 
  ArrowUpTrayIcon, 
  ClockIcon, 
  Square2StackIcon,
  Bars3Icon,
  XMarkIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('strength_insight_workouts');
    if (saved) {
      try {
        setWorkouts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse workouts", e);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('strength_insight_workouts', JSON.stringify(workouts));
  }, [workouts]);

  const addWorkouts = (newWorkouts: Workout[]) => {
    setWorkouts(prev => [...newWorkouts, ...prev]);
    setView('dashboard');
  };

  const deleteWorkout = (id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id));
  };

  const NavItem = ({ id, label, icon: Icon }: { id: AppView, label: string, icon: any }) => (
    <button
      onClick={() => { setView(id); setIsSidebarOpen(false); }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all w-full text-left ${
        view === id 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md z-40 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">S</div>
          <span className="font-bold tracking-tight text-xl">StrengthInsight</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <XMarkIcon className="w-7 h-7" /> : <Bars3Icon className="w-7 h-7" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 p-6 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center space-x-3 mb-12 hidden lg:flex">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl">S</div>
          <span className="font-bold tracking-tight text-2xl">StrengthInsight</span>
        </div>

        <nav className="flex flex-col space-y-2">
          <NavItem id="dashboard" label="Overview" icon={Square2StackIcon} />
          <NavItem id="upload" label="Upload Workout" icon={ArrowUpTrayIcon} />
          <NavItem id="history" label="Workout Logs" icon={ClockIcon} />
          <NavItem id="analytics" label="Progression" icon={ChartBarIcon} />
          <div className="pt-4 mt-4 border-t border-slate-800">
             <NavItem id="export" label="Export Data" icon={TableCellsIcon} />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pt-20 lg:pt-10">
        <div className="max-w-6xl mx-auto">
          {view === 'dashboard' && <Dashboard workouts={workouts} />}
          {view === 'upload' && <Uploader onWorkoutsExtracted={addWorkouts} />}
          {view === 'history' && <History workouts={workouts} onDelete={deleteWorkout} />}
          {view === 'analytics' && <Analytics workouts={workouts} />}
          {view === 'export' && <DataExport workouts={workouts} />}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
