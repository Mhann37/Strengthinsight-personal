
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import type { User } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const getEnv = (key: string): string | undefined => {
  // @ts-ignore
  const env = (typeof process !== 'undefined' && process.env) || (import.meta as any).env || {};
  return env[key] || env[`VITE_${key}`] || env[`REACT_APP_${key}`];
};

const config = {
  apiKey: getEnv('FIREBASE_API_KEY'),
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

/**
 * Authentication Helper
 * Detects iOS and in-app browsers to decide between Popup and Redirect login.
 */
export const signInWithGoogle = async () => {
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).platform || "";
  
  // Robust detection for iOS (iPhone, iPad, iPod) and iPadOS (MacIntel with touch)
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
                (platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  
  // Detection for common in-app browsers (Facebook, Instagram, etc.) that block popups
  const isInApp = /FBAN|FBAV|Instagram|Messenger|TikTok/.test(ua);

  if (isIOS || isInApp) {
    return signInWithRedirect(auth, googleProvider);
  } else {
    return signInWithPopup(auth, googleProvider);
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
