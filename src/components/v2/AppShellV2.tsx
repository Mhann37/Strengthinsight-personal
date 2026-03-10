import React, { useState, useMemo, useEffect } from 'react';
import { Workout, BodyweightEntry } from '../../../types';
import { trackEvent } from '../../../analytics';
import { useUserSettings } from '../../../contexts/UserSettingsContext';
import type { Unit } from '../../../utils/unit';
import type { User } from 'firebase/auth';
import { db, collection, addDoc, setDoc, deleteDoc, doc, query, where, onSnapshot } from '../../../firebase';

import DashboardV2 from './DashboardV2';
import ProgressionV2 from './ProgressionV2';
import SettingsV2 from './SettingsV2';
import OnboardingOverlay from './OnboardingOverlay';
import UploadWrapperV2 from './UploadWrapperV2';
import BodyweightV2 from './BodyweightV2';
import CalendarV2 from './CalendarV2';

// V1 components reused in V2
import History from '../../../components/History';
import MuscleGroups from '../../../components/MuscleGroups';
import DataExport from '../../../components/DataExport';

import {
  Square2StackIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  UserIcon,
  TableCellsIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  XMarkIcon,
  FireIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

export type V2View =
  | 'dashboard'
  | 'upload'
  | 'analytics'
  | 'muscleGroups'
  | 'history'
  | 'export'
  | 'settings'
  | 'calendar'
  | 'body';

interface AppShellV2Props {
  user: User;
  workouts: Workout[];
  dataLoading: boolean;
  view: V2View;
  setView: (v: V2View) => void;
  addWorkouts: (w: Workout[]) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  handleLogout: () => void;
}

// ── Streak calculator ─────────────────────────────────────────
const calcStreak = (workouts: Workout[]): number => {
  if (workouts.length === 0) return 0;

  // Build set of ISO week keys that have workouts
  const weekSet = new Set<string>();
  for (const w of workouts) {
    const d = new Date(w.date);
    if (Number.isNaN(d.getTime())) continue;
    // ISO week: Mon-start week key = Monday of that week
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(d);
    mon.setDate(mon.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    weekSet.add(mon.toISOString().slice(0, 10));
  }

  // Walk backwards from current week
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const thisMon = new Date(now);
  thisMon.setDate(thisMon.getDate() + diff);
  thisMon.setHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(thisMon);
  while (weekSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
};

// ── Mobile bottom sheet ──────────────────────────────────────
const MoreSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onNav: (v: V2View) => void;
  onLogout: () => void;
}> = ({ open, onClose, onNav, onLogout }) => {
  if (!open) return null;

  const items: { id: V2View; label: string; icon: React.ElementType }[] = [
    { id: 'calendar', label: 'Training History', icon: CalendarDaysIcon },
    { id: 'body', label: 'Body Weight', icon: ScaleIcon },
    { id: 'history', label: 'Workout Logs', icon: ClockIcon },
    { id: 'export', label: 'Export Data', icon: TableCellsIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 rounded-t-3xl p-6 pb-10 animate-slideUp">
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNav(item.id); onClose(); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          <div className="border-t border-slate-800 mt-2 pt-2">
            <button
              onClick={() => { onLogout(); onClose(); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const AppShellV2: React.FC<AppShellV2Props> = ({
  user,
  workouts,
  dataLoading,
  view,
  setView,
  addWorkouts,
  deleteWorkout,
  handleLogout,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { settings, setUnit, isLoading: isSettingsLoading } = useUserSettings();
  const unit: Unit = settings.unit;

  const streak = useMemo(() => calcStreak(workouts), [workouts]);

  // ── Bodyweight state + Firestore listener ──────────────────
  const [bodyweightEntries, setBodyweightEntries] = useState<BodyweightEntry[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'bodyweight'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const entries = snap.docs.map((d) => ({ ...d.data(), id: d.id })) as BodyweightEntry[];
      entries.sort((a, b) => b.date.localeCompare(a.date));
      setBodyweightEntries(entries);
    });
    return () => unsub();
  }, [user.uid]);

  const latestBodyweightKg = bodyweightEntries.length > 0 ? bodyweightEntries[0].weight : undefined;

  const handleAddBodyweight = async (weightKg: number, bwUnit: Unit, date: string) => {
    // Optimistic update — show immediately without waiting for onSnapshot
    const optimisticEntry: BodyweightEntry = {
      id: `optimistic-${date}`,
      userId: user.uid,
      date,
      weight: weightKg,
      unit: bwUnit,
      createdAt: new Date().toISOString(),
    };
    setBodyweightEntries((prev) => {
      const next = [optimisticEntry, ...prev.filter((e) => e.date !== date)];
      next.sort((a, b) => b.date.localeCompare(a.date));
      return next;
    });
    await addDoc(collection(db, 'bodyweight'), {
      userId: user.uid,
      date,
      weight: weightKg,
      unit: bwUnit,
      createdAt: new Date().toISOString(),
    });
    // onSnapshot will replace the optimistic entry with the real one
  };

  const handleUpdateBodyweight = async (id: string, weightKg: number, bwUnit: Unit) => {
    // Optimistic update
    setBodyweightEntries((prev) =>
      prev.map((e) => e.id === id ? { ...e, weight: weightKg, unit: bwUnit } : e)
    );
    await setDoc(doc(db, 'bodyweight', id), { weight: weightKg, unit: bwUnit }, { merge: true });
  };

  const handleDeleteBodyweight = async (id: string) => {
    setBodyweightEntries((prev) => prev.filter((e) => e.id !== id));
    await deleteDoc(doc(db, 'bodyweight', id));
  };

  // Onboarding check — show only on first login (once ever)
  React.useEffect(() => {
    try {
      if (localStorage.getItem('si:onboarding-complete:v2') === '1') return;
      localStorage.setItem('si:onboarding-complete:v2', '1');
    } catch {}
    setShowOnboarding(true);
  }, []);

  const handleOnboardingComplete = (selectedUnit: Unit) => {
    setUnit(selectedUnit);
    try { localStorage.setItem('si:onboarding-complete:v2', '1'); } catch {}
    setShowOnboarding(false);
    setView('upload');
  };

  const handleNavClick = (id: V2View) => {
    setView(id);
    setIsSidebarOpen(false);
    if (id === 'analytics') { trackEvent('view_analytics_opened', { workout_count: workouts.length }); trackEvent('progression_viewed'); }
    if (id === 'history') trackEvent('view_history_opened', { workout_count: workouts.length });
  };

  // ── Desktop sidebar nav item ──
  const SideNavItem: React.FC<{ id: V2View; label: string; icon: React.ElementType; isBeta?: boolean }> = ({
    id, label, icon: Icon, isBeta,
  }) => {
    const active = view === id;
    return (
      <button
        onClick={() => handleNavClick(id)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left relative ${
          active
            ? 'bg-blue-600/10 text-white border-l-[3px] border-blue-500 pl-[13px]'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Icon className={`w-5 h-5 ${active ? 'text-blue-500' : ''}`} />
        <span className="font-medium text-sm">{label}</span>
        {isBeta && (
          <span className="ml-auto px-1.5 py-0.5 bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase rounded-md border border-orange-500/20 leading-none">
            Beta
          </span>
        )}
      </button>
    );
  };

  // ── Mobile bottom nav item ──
  const BottomNavItem: React.FC<{
    id: V2View;
    label: string;
    icon: React.ElementType;
    onClick?: () => void;
  }> = ({ id, label, icon: Icon, onClick }) => {
    const active = view === id;
    return (
      <button
        onClick={onClick || (() => handleNavClick(id))}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
          active ? 'text-blue-500' : 'text-slate-500'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-bold">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* ── Mobile top bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md z-40 px-5 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-120.png" alt="StrengthInsight" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-lg">StrengthInsight</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <XMarkIcon className="w-7 h-7 text-slate-400" /> : <Bars3Icon className="w-7 h-7 text-slate-400" />}
        </button>
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 p-6 transform transition-transform duration-300
        lg:relative lg:translate-x-0 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:flex items-center gap-3 mb-10">
          <img src="/icons/icon-120.png" alt="StrengthInsight" className="w-10 h-10 rounded-xl object-contain flex-shrink-0" />
          <span className="font-bold text-2xl">StrengthInsight</span>
        </div>

        <nav className="flex-1 space-y-1">
          <SideNavItem id="dashboard" label="Overview" icon={Square2StackIcon} />
          <SideNavItem id="upload" label="Upload Workout" icon={ArrowUpTrayIcon} />
          <SideNavItem id="analytics" label="Progression" icon={ChartBarIcon} />
          <SideNavItem id="muscleGroups" label="Muscle Groups" icon={UserIcon} isBeta />
          <SideNavItem id="calendar" label="Training History" icon={CalendarDaysIcon} />
          <SideNavItem id="body" label="Body Weight" icon={ScaleIcon} />
          <SideNavItem id="history" label="Workout Logs" icon={ClockIcon} />

          <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
            <SideNavItem id="export" label="Export Data" icon={TableCellsIcon} />
            <SideNavItem id="settings" label="Settings" icon={Cog6ToothIcon} />
          </div>

          {/* Streak */}
          <div className="mt-6 px-4">
            <div className="flex items-center gap-2 text-sm">
              <FireIcon className={`w-5 h-5 ${streak > 0 ? 'text-amber-500' : 'text-slate-600'}`} />
              {streak > 0 ? (
                <span className="text-amber-500 font-bold">{streak} week streak</span>
              ) : (
                <span className="text-slate-500 font-medium">Start your streak</span>
              )}
            </div>
          </div>
        </nav>

        {/* User profile */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-4 overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">{user.displayName || 'Athlete'}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-500 truncate max-w-[120px]">{user.email}</p>
                <span className="text-[9px] font-black bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">V2</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 w-full transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pt-20 lg:pt-10 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto">
          {dataLoading && workouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 text-sm font-medium">Syncing Records...</p>
            </div>
          ) : (
            <>
              {view === 'dashboard' && <DashboardV2 workouts={workouts} userName={user.displayName} setView={setView} />}
              {view === 'upload' && <UploadWrapperV2 onWorkoutsExtracted={addWorkouts} existingWorkouts={workouts} />}
              {view === 'analytics' && <ProgressionV2 workouts={workouts} latestBodyweightKg={latestBodyweightKg} setView={setView} />}
              {view === 'muscleGroups' && <MuscleGroups workouts={workouts} />}
              {view === 'history' && <History workouts={workouts} onDelete={deleteWorkout} />}
              {view === 'export' && <DataExport workouts={workouts} />}
              {view === 'settings' && <SettingsV2 user={user} unit={unit} setUnit={setUnit} isLoading={isSettingsLoading} workouts={workouts} onLogout={handleLogout} />}
              {view === 'calendar' && <CalendarV2 workouts={workouts} />}
              {view === 'body' && (
                <BodyweightV2
                  userId={user.uid}
                  entries={bodyweightEntries}
                  onAdd={handleAddBodyweight}
                  onUpdate={handleUpdateBodyweight}
                  onDelete={handleDeleteBodyweight}
                />
              )}
            </>
          )}
        </div>

        <footer className="mt-16 pb-6 text-center text-xs text-slate-500">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Privacy Policy</a>
        </footer>
      </main>

      {/* ── Mobile bottom nav ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 flex">
        <BottomNavItem id="dashboard" label="Overview" icon={Square2StackIcon} />
        <BottomNavItem id="upload" label="Upload" icon={ArrowUpTrayIcon} />
        <BottomNavItem id="analytics" label="Progress" icon={ChartBarIcon} />
        <BottomNavItem id="muscleGroups" label="Muscles" icon={UserIcon} />
        <BottomNavItem id="settings" label="More" icon={EllipsisHorizontalIcon} onClick={() => setMoreOpen(true)} />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── More bottom sheet ── */}
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onNav={handleNavClick} onLogout={handleLogout} />

      {/* ── Onboarding ── */}
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AppShellV2;
