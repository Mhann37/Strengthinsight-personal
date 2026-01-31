import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup 
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

export { 
  auth, 
  db, 
  functions, 
  googleProvider,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  collection,
  addDoc,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot,
  httpsCallable
};

export type { User };
