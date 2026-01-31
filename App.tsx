
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
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
  onSnapshot 
} from './firebase';
import { AppView, Workout } from './types';
import Dashboard from './components/Dashboard';
import Uploader from './components/Uploader';
import History from './components/History';
import Analytics from './components/Analytics';
import DataExport from './components/DataExport';
import MuscleGroups from './components/MuscleGroups';
import Login from './components/Login';
import { 
  ChartBarIcon, 
  ArrowUpTrayIcon, 
  ClockIcon, 
  Square2StackIcon,
  Bars3Icon,
  XMarkIcon,
  TableCellsIcon,
  ArrowRightOnRectangleIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [view, setView] = useState<AppView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) setWorkouts([]);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const workoutsRef = collection(db, 'workouts');
    const q = query(workoutsRef, where('userId', '==', user.uid));

    const unsubscribeWorkouts = onSnapshot(q, (snapshot) => {
      const fetchedWorkouts = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Workout[];
      
      const sorted = fetchedWorkouts.sort((a, b) => 
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );
      
      setWorkouts(sorted);
      setDataLoading(false);
    }, (error) => {
      console.error("Data Sync Error:", error);
      setDataLoading(false);
    });

    return () => unsubscribeWorkouts();
  }, [user]);

  const addWorkouts = async (newWorkouts: Workout[]) => {
    if (!user) return;
    try {
      const workoutsRef = collection(db, 'workouts');
      const savePromises = newWorkouts.map(workout => {
        const { id, ...data } = workout; 
        return addDoc(workoutsRef, {
          ...data,
          userId: user.uid,
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(savePromises);
      setView('dashboard');
    } catch (error) {
      console.error("Error saving workouts:", error);
    }
  };

  const deleteWorkout = async (id: string) => {
    if (!user || !confirm("Delete this workout?")) return;
    try {
      await deleteDoc(doc(db, 'workouts', id));
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Login />;

  const NavItem = ({ id, label, icon: Icon, isBeta }: { id: AppView, label: string, icon: any, isBeta?: boolean }) => (
    <button
      onClick={() => { setView(id); setIsSidebarOpen(false); }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all w-full text-left relative group ${
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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white italic">S</div>
          <span className="font-bold text-xl">StrengthInsight</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <XMarkIcon className="w-7 h-7 text-slate-400" /> : <Bars3Icon className="w-7 h-7 text-slate-400" />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 p-6 transform transition-transform duration-300 lg:relative lg:translate-x-0 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center space-x-3 mb-10 hidden lg:flex">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl italic">S</div>
          <span className="font-bold text-2xl">StrengthInsight</span>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem id="dashboard" label="Overview" icon={Square2StackIcon} />
          <NavItem id="muscleGroups" label="Muscle Groups" icon={UserIcon} isBeta={true} />
          <NavItem id="upload" label="Upload Workout" icon={ArrowUpTrayIcon} />
          <NavItem id="history" label="Workout Logs" icon={ClockIcon} />
          <NavItem id="analytics" label="Progression" icon={ChartBarIcon} />
          <div className="pt-4 mt-4 border-t border-slate-800">
             <NavItem id="export" label="Export Data" icon={TableCellsIcon} />
          </div>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4 px-4 overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
               <p className="text-sm font-bold text-slate-200 truncate">{user.displayName || 'Athlete'}</p>
               <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 w-full transition-colors">
            <ArrowRightOnRectangleIcon className="w-6 h-6" />
            <span className="font-medium">Logout</span>
          </button>
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
      </main>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default App;
