import React, { useState, useEffect } from 'react';
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot,
  getRedirectResult,
  User,
} from './firebase';
import { AppView, Workout } from './types';
import Dashboard from './components/Dashboard';
import Uploader from './components/Uploader';
import History from './components/History';
import Analytics from './components/Analytics';
import DataExport from './components/DataExport';
import MuscleGroups from './components/MuscleGroups';
import { UserSettingsProvider, useUserSettings } from './contexts/UserSettingsContext';
import Login from './components/Login';
import type { Unit } from './utils/unit';
import {
  ChartBarIcon,
  ArrowUpTrayIcon,
  ClockIcon,
  Square2StackIcon,
  Bars3Icon,
  XMarkIcon,
  TableCellsIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const UnitToggle: React.FC = () => {
  const { settings, setUnit, isLoading } = useUserSettings();
  const unit = settings.unit;

  const handleSet = async (next: Unit) => {
    try {
      await setUnit(next);
    } catch (e) {
      console.warn('Failed to set unit:', e);
      // If Firestore write fails, context already updated locally; we keep UI consistent.
    }
  };

  return (
    <div className="px-4">
      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">
        Units
      </div>

      <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 w-full">
        <button
          disabled={isLoading}
          onClick={() => handleSet('kg')}
          className={`flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            unit === 'kg'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-500 hover:text-slate-300'
          } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          title="Metric (kg)"
        >
          Metric
        </button>
        <button
          disabled={isLoading}
          onClick={() => handleSet('lbs')}
          className={`flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            unit === 'lbs'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
              : 'text-slate-500 hover:text-slate-300'
          } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          title="Imperial (lbs)"
        >
          Imperial
        </button>
      </div>

      <p className="mt-2 text-[11px] text-slate-500 leading-snug">
        Controls how weights &amp; volume are displayed. Storage remains normalized for analytics.
      </p>
    </div>
  );
};

const AppInner: React.FC<{ user: User }> = ({ user }) => {
  const [dataLoading, setDataLoading] = useState(false);
  const [view, setView] = useState<AppView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const workoutsRef = collection(db, 'workouts');
    const q = query(workoutsRef, where('userId', '==', user.uid));

    const unsubscribeWorkouts = onSnapshot(
      q,
      (snapshot) => {
        const fetchedWorkouts = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        })) as Workout[];

        const sorted = fetchedWorkouts.sort((a, b) => {
          const timeA = a.date ? new Date(a.date).getTime() : 0;
          const timeB = b.date ? new Date(b.date).getTime() : 0;
          return timeB - timeA;
        });

        setWorkouts(sorted);
        setDataLoading(false);
      },
      (error) => {
        console.error('Data Sync Error:', error);
        setDataLoading(false);
      }
    );

    return () => unsubscribeWorkouts();
  }, [user]);

  const addWorkouts = async (newWorkouts: Workout[]) => {
    if (!user) return;
    try {
      const workoutsRef = collection(db, 'workouts');

      for (const workout of newWorkouts) {
        const isDuplicate = workouts.some((existing) => {
          const existingDate = existing.date ? existing.date.slice(0, 16) : '';
          const newDate = workout.date ? workout.date.slice(0, 16) : '';
          return existingDate === newDate;
        });

        if (isDuplicate) {
          throw new Error(
            `A session for ${new Date(workout.date).toLocaleDateString()} at ${new Date(
              workout.date
            ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} is already in your history.`
          );
        }
      }

      const savePromises = newWorkouts.map((workout) => {
        const { id, ...data } = workout;
        return addDoc(workoutsRef, {
          ...data,
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        });
      });

      await Promise.all(savePromises);
      setView('dashboard');
    } catch (error: any) {
      console.error('Error saving workouts:', error);
      throw error;
    }
  };

  const deleteWorkout = async (id: string) => {
    if (!user || !confirm('Delete this workout?')) return;
    try {
      await deleteDoc(doc(db, 'workouts', id));
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const NavItem = ({
    id,
    label,
    icon: Icon,
    isBeta,
  }: {
    id: AppView;
    label: string;
    icon: any;
    isBeta?: boolean;
  }) => (
    <button
      onClick={() => {
        setView(id);
        setIsSidebarOpen(false);
      }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all w-full text-left relative ${
        view === id
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-medium">{label}</span>
      {isBeta && (
        <span className="ml-2 px-1.5 py-0.5 bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase rounded-md border border-orange-500/20 leading-none">
          Beta
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-950">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-md z-40 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white italic">
            S
          </div>
          <span className="font-bold text-xl">StrengthInsight</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? (
            <XMarkIcon className="w-7 h-7 text-slate-400" />
          ) : (
            <Bars3Icon className="w-7 h-7 text-slate-400" />
          )}
        </button>
      </div>

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 p-6 transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center space-x-3 mb-10 hidden lg:flex">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl italic">
            S
          </div>
          <span className="font-bold text-2xl">StrengthInsight</span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem id="dashboard" label="Overview" icon={Square2StackIcon} />
          <NavItem id="upload" label="Upload Workout" icon={ArrowUpTrayIcon} />
          <NavItem id="analytics" label="Progression" icon={ChartBarIcon} />
          <NavItem id="muscleGroups" label="Muscle Groups" icon={UserIcon} isBeta={true} />
          <NavItem id="history" label="Workout Logs" icon={ClockIcon} />

          <div className="pt-4 mt-4 border-t border-slate-800 space-y-1">
            <NavItem id="export" label="Export Data" icon={TableCellsIcon} />
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
          {/* ✅ Global Unit toggle */}
          <UnitToggle />

          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center space-x-3 mb-4 px-4 overflow-hidden">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full border border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate">
                  {user.displayName || 'Athlete'}
                </p>
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <p className="text-xs truncate max-w-[120px]">{user.email}</p>
                  <LockClosedIcon className="w-3 h-3 text-slate-600" title="Data Isolated" />
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 w-full transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-6 h-6" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pt-20 lg:pt-10">
        <div className="max-w-6xl mx-auto">
          {dataLoading && workouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 text-sm font-medium">Syncing Records...</p>
            </div>
          ) : (
            <>
              {view === 'dashboard' && <Dashboard workouts={workouts} userName={user?.displayName} />}
              {view === 'muscleGroups' && <MuscleGroups workouts={workouts} />}
              {view === 'upload' && <Uploader onWorkoutsExtracted={addWorkouts} />}
              {view === 'history' && <History workouts={workouts} onDelete={deleteWorkout} />}
              {view === 'analytics' && <Analytics workouts={workouts} />}
              {view === 'export' && <DataExport workouts={workouts} />}
            </>
          )}
        </div>

        <footer className="mt-16 pb-6 text-center text-xs text-slate-500">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-400 transition-colors"
          >
            Privacy Policy
          </a>
        </footer>
      </main>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let redirectChecked = false;
    let authStateChecked = false;

    const tryFinishLoading = () => {
      if (!isMounted) return;
      if (auth.currentUser) {
        setLoading(false);
      } else if (redirectChecked && authStateChecked) {
        setLoading(false);
      }
    };

    getRedirectResult(auth)
      .then(() => {
        if (isMounted) {
          redirectChecked = true;
          tryFinishLoading();
        }
      })
      .catch((error) => {
        console.error('Redirect Error:', error);
        if (isMounted) {
          redirectChecked = true;
          tryFinishLoading();
        }
      });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;

      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        setUser(null);
        authStateChecked = true;
        tryFinishLoading();
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium animate-pulse">Authenticating Session...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <UserSettingsProvider userId={user.uid}>
      <AppInner user={user} />
    </UserSettingsProvider>
  );
};

export default App;
