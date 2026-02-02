import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import type { User } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import * as firestoreModule from "firebase/firestore";

// Bypass missing type definitions in some environments
const {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot
} = firestoreModule as any;

const getEnv = (key: string): string | undefined => {
  // @ts-ignore
  const env = (typeof process !== 'undefined' && process.env) || (import.meta as any).env || {};
  return env[key] || env[`VITE_${key}`] || env[`REACT_APP_${key}`];
};

// Fallback to API_KEY if FIREBASE_API_KEY is missing. 
const apiKey = getEnv('FIREBASE_API_KEY') || getEnv('API_KEY');

const config = {
  apiKey: apiKey,
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID')
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const googleProvider = new GoogleAuthProvider();

// Ensure local persistence is set (helps with iOS Safari intermittent state loss)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth Persistence Error:", error);
});

/**
 * Authentication Helper
 * Prefers Popup flow to avoid page reloads and redirect loops.
 * Falls back to Redirect only if necessary.
 */
export const signInWithGoogle = async () => {
  try {
    // Attempt Popup login first (works on modern iOS/Android)
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.warn("Popup sign-in failed, attempting redirect fallback...", error.code);
    
    // Fallback to redirect if popup is blocked or environment doesn't support it
    if (
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      return signInWithRedirect(auth, googleProvider);
    }
    throw error;
  }
};

export { 
  auth, 
  db, 
  functions, 
  googleProvider,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  query,
  where,
  deleteDoc, 
  doc, 
  onSnapshot,
  httpsCallable,
  getRedirectResult
};

export type { User };