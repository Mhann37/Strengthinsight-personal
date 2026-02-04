import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { db, doc, onSnapshot, setDoc, serverTimestamp } from '../firebase';
import type { Unit } from '../utils/unit';
import { inferDefaultUnitFromBrowser } from '../utils/unit';

type UserSettings = { unit: Unit };

type Ctx = {
  settings: UserSettings;
  setUnit: (unit: Unit) => Promise<void>;
  isLoading: boolean;
};

const UserSettingsContext = createContext<Ctx | null>(null);

export const useUserSettings = (): Ctx => {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error('useUserSettings must be used within <UserSettingsProvider />');
  return ctx;
};

const isUnit = (x: any): x is Unit => x === 'kg' || x === 'lbs';

export const UserSettingsProvider: React.FC<{ userId: string; children: React.ReactNode }> = ({
  userId,
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [unit, setUnitState] = useState<Unit>('kg');

  useEffect(() => {
    if (!userId) return;

    const storageKey = `strengthinsight:unit:${userId}`;
    const fromStorage = (): Unit | null => {
      try {
        const v = localStorage.getItem(storageKey);
        return isUnit(v) ? v : null;
      } catch {
        return null;
      }
    };
    const saveStorage = (u: Unit) => {
      try {
        localStorage.setItem(storageKey, u);
      } catch {}
    };

    const ref = doc(db, 'userSettings', userId);

    const unsubscribe = onSnapshot(
      ref,
      async (snap: any) => {
        const data = snap?.data?.();

        // If doc missing, create it with best-available default (storage > browser infer)
        if (!snap?.exists?.()) {
          const guessed = fromStorage() ?? inferDefaultUnitFromBrowser();
          setUnitState(guessed);
          saveStorage(guessed);

          try {
            await setDoc(
              ref,
              { unit: guessed, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
              { merge: true }
            );
          } catch (e) {
            // Firestore write failed; we still keep local storage + state.
            console.warn('Unable to create userSettings doc:', e);
          }

          setIsLoading(false);
          return;
        }

        const nextUnit: Unit = data?.unit === 'lbs' ? 'lbs' : 'kg';
        setUnitState(nextUnit);
        saveStorage(nextUnit);
        setIsLoading(false);
      },
      (err: any) => {
        console.warn('User settings subscription error:', err);

        // If Firestore read fails, prefer localStorage; else browser infer.
        const fallback = fromStorage() ?? inferDefaultUnitFromBrowser();
        setUnitState(fallback);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const setUnit = async (next: Unit) => {
    const storageKey = `strengthinsight:unit:${userId}`;
    try {
      localStorage.setItem(storageKey, next);
    } catch {}

    const ref = doc(db, 'userSettings', userId);
    setUnitState(next);

    // Best effort Firestore write
    await setDoc(ref, { unit: next, updatedAt: serverTimestamp() }, { merge: true });
  };

  const value = useMemo<Ctx>(() => ({ settings: { unit }, setUnit, isLoading }), [unit, isLoading]);

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
};
