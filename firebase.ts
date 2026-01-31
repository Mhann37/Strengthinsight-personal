// Modular Firebase initialization for v9+
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Robust environment variable accessor.
 * Supports standard process.env (Node/System) and import.meta.env (Vite).
 */
const getEnv = (key: string): string | undefined => {
  // @ts-ignore - Handle environments where process might not be defined
  const env = (typeof process !== 'undefined' && process.env) || (import.meta as any).env || {};
  return env[key];
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

// Initialize the Firebase app instance
const app = initializeApp(firebaseConfig);

// Export service instances for use throughout the application
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
