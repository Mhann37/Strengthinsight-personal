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
import { Workout } from './types';
import { trackEvent } from './analytics';
import { UserSettingsProvider } from './contexts/UserSettingsContext';
import Login from './components/Login';
import AppShellV2 from './src/components/v2/AppShellV2';
import type { V2View } from './src/components/v2/AppShellV2';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [view, setView] = useState<V2View>('dashboard');
  const [workouts, setWorkouts] = useState<Workout[]>([]);

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
        setWorkouts([]);
        authStateChecked = true;
        tryFinishLoading();
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);

    const workoutsRef = collection(db, 'workouts');
    const q = query(workoutsRef, where('userId', '==', user.uid));

    const unsubscribeWorkouts = onSnapshot(
      q,
      (snapshot) => {
        const fetchedWorkouts = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
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

    const workoutsRef = collection(db, 'workouts');

    for (const workout of newWorkouts) {
      const isDuplicate = workouts.some((existing) => {
        const existingDate = existing.date ? existing.date.slice(0, 16) : '';
        const newDate = workout.date ? workout.date.slice(0, 16) : '';
        return existingDate === newDate;
      });

      if (isDuplicate) {
        throw new Error(
          `A session for ${new Date(workout.date).toLocaleDateString()} at ${new Date(workout.date).toLocaleTimeString(
            [],
            { hour: '2-digit', minute: '2-digit' }
          )} is already in your history.`
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

    const prevCount = workouts.length;
    const nextCount = prevCount + newWorkouts.length;

    const oldestDate = workouts.length ? workouts[workouts.length - 1]?.date : null;
    const daysSinceFirst = oldestDate
      ? Math.floor((Date.now() - new Date(oldestDate).getTime()) / 86_400_000)
      : 0;
    trackEvent('workout_saved', {
      workout_count: newWorkouts.length,
      total_saved_workouts: nextCount,
      days_since_first_workout: daysSinceFirst,
    });

    if (prevCount < 5 && nextCount >= 5) trackEvent('user_reached_5_workouts', { total_workouts: nextCount });
    if (prevCount < 20 && nextCount >= 20) trackEvent('user_reached_20_workouts', { total_workouts: nextCount });

    setView('dashboard');
  };

  const deleteWorkout = async (id: string) => {
    if (!user || !confirm('Delete this workout?')) return;
    await deleteDoc(doc(db, 'workouts', id));
  };

  const handleLogout = () => signOut(auth);

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
      <AppShellV2
        user={user}
        workouts={workouts}
        dataLoading={dataLoading}
        view={view}
        setView={setView}
        addWorkouts={addWorkouts}
        deleteWorkout={deleteWorkout}
        handleLogout={handleLogout}
      />
    </UserSettingsProvider>
  );
};

export default App;
