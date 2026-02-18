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
  setPersistence,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import * as firestoreModule from "firebase/firestore";
import { trackEvent, setUserProps } from "./analytics";

// ✅ App Check (Web)
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";

// Bypass missing type definitions in some environments
const {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  setDoc,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} = firestoreModule as any;

const getEnv = (key: string): string | undefined => {
  // @ts-ignore
  const env = (typeof process !== "undefined" && process.env) || (import.meta as any).env || {};
  return env[key] || env[`VITE_${key}`] || env[`REACT_APP_${key}`];
};

// Fallback to API_KEY if FIREBASE_API_KEY is missing.
const apiKey = getEnv("FIREBASE_API_KEY");
if (!apiKey) {
  throw new Error("Missing FIREBASE_API_KEY (or VITE_FIREBASE_API_KEY)");
}

const config = {
  apiKey: apiKey,
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("FIREBASE_APP_ID"),
};

export const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
const googleProvider = new GoogleAuthProvider();

// ✅ App Check init (non-breaking)
const appCheckSiteKey = getEnv("FIREBASE_APPCHECK_SITE_KEY");
const appCheckDebugToken = getEnv("FIREBASE_APPCHECK_DEBUG_TOKEN");

let appCheck: any = null;

try {
  if (typeof window !== "undefined" && appCheckSiteKey) {
    if (appCheckDebugToken) {
      // @ts-expect-error Firebase reads this global when using debug tokens
      (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
    }

    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (e) {
  console.warn("App Check init failed:", e);
}

// ✅ Used by geminiService before calling httpsCallable
export const ensureAppCheckToken = async (): Promise<void> => {
  if (!appCheck) return;
  try {
    await getToken(appCheck, false);
  } catch (e) {
    console.warn("App Check token fetch failed:", e);
  }
};

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
    const result = await signInWithPopup(auth, googleProvider);

    // GA: login completed
    trackEvent("login_completed", { method: "google_popup" });
    setUserProps({ logged_in: true });

    return result;
  } catch (error: any) {
    console.warn("Popup sign-in failed, attempting redirect fallback...", error.code);

    // Fallback to redirect if popup is blocked or environment doesn't support it
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/operation-not-supported-in-this-environment"
    ) {
      trackEvent("login_started", { method: "google_redirect" });
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
  getDoc,
  setDoc,
  query,
  where,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  httpsCallable,
  getRedirectResult,
};

export type { User };
