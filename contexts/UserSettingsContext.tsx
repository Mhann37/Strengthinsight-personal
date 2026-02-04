import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, doc, onSnapshot, setDoc, serverTimestamp } from '../firebase';
import type { Unit } from '../utils/unit';
import { inferDefaultUnitFromBrowser } from '../utils/unit';

type UserSettings = {
  unit: Unit;
};

type Ctx = {
  settings: UserSettings;
  setUnit: (unit: Unit) => Promise<void>;
  isLoading: boolean;
};

const UserSettingsContext = createContext<Ctx | null>(null);

export const useUserSettings = (): Ctx => {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    throw new Error('useUserSettings must be used within <UserSettingsProvider />');
  }
  return ctx;
};

export const UserSettingsProvider: React.FC<{ userId: string; children: React.ReactNode }> = ({
  userId,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [unit, setUnitState] = useState<Unit>('kg');

  useEffect(() => {
    if (!userId) return;

    const ref = doc(db, 'userSettings', userId);
    const unsubscribe = onSnapshot(
      ref,
      async (snap: any) => {
        const data = snap?.data?.();

        // First run: if no doc yet, create it with a sensible default
        if (!snap?.exists?.()) {
          const guessed = inferDefaultUnitFromBrowser();
          setUnitState(guessed);
          try {
            await setDoc(
              ref,
              {
                unit: guessed,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (e) {
            // If Firestore write fails, keep local default and continue.
            console.warn('Unable to create userSettings doc:', e);
          }
          setIsLoading(false);
          return;
        }

        const nextUnit: Unit = data?.unit === 'lbs' ? 'lbs' : 'kg';
        setUnitState(nextUnit);
        setIsLoading(false);
      },
      (err: any) => {
        console.warn('User settings subscription error:', err);
        setUnitState(inferDefaultUnitFromBrowser());
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const setUnit = async (next: Unit) => {
    const ref = doc(db, 'userSettings', userId);
    setUnitState(next);
    await setDoc(
      ref,
      {
        unit: next,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const value = useMemo<Ctx>(
    () => ({
      settings: { unit },
      setUnit,
      isLoading,
    }),
    [unit, isLoading]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
};
