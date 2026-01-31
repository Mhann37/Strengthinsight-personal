
// Modular Firebase initialization with LocalStorage fallback for offline-first resilience
// Rewritten to use firebase/compat imports to resolve typescript module errors
// while maintaining v9-compatible exports for the app consumption.

import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/functions";

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

// Check if we have a valid configuration
const isConfigValid = config.apiKey && config.apiKey !== 'undefined' && config.apiKey.length > 10;

let app: firebase.app.App;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;
let functions: firebase.functions.Functions;

if (isConfigValid) {
  try {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(config);
    } else {
      app = firebase.apps[0];
    }
    auth = firebase.auth();
    db = firebase.firestore();
    functions = firebase.functions();
  } catch (e) {
    console.error("Firebase initialization failed, falling back to Mock mode", e);
    setupMocks();
  }
} else {
  console.warn("No valid Firebase config found. Running in Local Persistence Mode (Offline).");
  setupMocks();
}

function setupMocks() {
  // Mock User Object
  const mockUser = {
    uid: 'local-user-123',
    displayName: 'Local Athlete',
    email: 'offline@strengthinsight.local',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-token',
    getIdTokenResult: async () => ({}) as any,
    reload: async () => {},
    toJSON: () => ({})
  } as unknown as firebase.User;

  // Mock Auth
  auth = {
    currentUser: mockUser,
  } as any;

  // Mock DB (using LocalStorage)
  db = { isMock: true } as any;
  
  // Mock Functions
  functions = { isMock: true } as any;
}

export { auth, db, functions };
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Type Export
export type User = firebase.User;

// Standardized wrappers to handle both Real Firebase (v8 adapt to v9) and Mock Persistence
export const onAuthStateChanged = (authObj: any, callback: (user: User | null) => void) => {
  if ((db as any).isMock) {
    // Simulate async auth load
    setTimeout(() => callback(authObj.currentUser), 500);
    return () => {};
  }
  return authObj.onAuthStateChanged(callback);
};

export const signOut = (authObj: any) => {
  if ((db as any).isMock) {
    authObj.currentUser = null;
    window.location.reload(); // Hard reset for mock
    return Promise.resolve();
  }
  return authObj.signOut();
};

export const signInWithPopup = (authObj: any, provider: any) => {
  if ((db as any).isMock) {
    setupMocks(); // Re-initialize
    window.location.reload();
    return Promise.resolve();
  }
  return authObj.signInWithPopup(provider);
};

// Firestore Mocks/Wrappers for v9 compat
export const collection = (dbObj: any, path: string) => {
  if ((dbObj as any).isMock) return { path, isMock: true };
  return dbObj.collection(path);
};

export const doc = (dbObj: any, path: string, id: string) => {
  if ((dbObj as any).isMock) return { path, id, isMock: true };
  // Handle doc(db, collection, id) usage
  return dbObj.collection(path).doc(id);
};

export const query = (col: any, ...constraints: any[]) => {
  if (col.isMock) return col;
  
  let q = col;
  constraints.forEach(c => {
    if (c.type === 'where') {
      q = q.where(c.field, c.op, c.val);
    }
  });
  return q;
};

export const where = (field: string, op: string, val: any) => {
  return { type: 'where', field, op, val };
};

export const onSnapshot = (q: any, callback: (snapshot: any) => void, errorCallback?: (error: any) => void) => {
  if (q.isMock) {
    const load = () => {
      const data = JSON.parse(localStorage.getItem(`mock_db_${q.path}`) || '[]');
      callback({
        docs: data.map((item: any) => ({
          id: item.id,
          data: () => item
        }))
      });
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }
  return q.onSnapshot(callback, errorCallback);
};

export const addDoc = (col: any, data: any) => {
  if (col.isMock) {
    const existing = JSON.parse(localStorage.getItem(`mock_db_${col.path}`) || '[]');
    const newDoc = { ...data, id: `local-${Date.now()}` };
    localStorage.setItem(`mock_db_${col.path}`, JSON.stringify([...existing, newDoc]));
    window.dispatchEvent(new Event('storage')); // Trigger listeners
    return Promise.resolve(newDoc);
  }
  return col.add(data);
};

export const deleteDoc = (docRef: any) => {
  if (docRef.isMock) {
    const existing = JSON.parse(localStorage.getItem(`mock_db_${docRef.path}`) || '[]');
    const filtered = existing.filter((item: any) => item.id !== docRef.id);
    localStorage.setItem(`mock_db_${docRef.path}`, JSON.stringify(filtered));
    window.dispatchEvent(new Event('storage'));
    return Promise.resolve();
  }
  return docRef.delete();
};

export const httpsCallable = (functionsInstance: any, name: string) => {
  if ((functionsInstance as any).isMock) {
    return async (data: any) => {
      console.warn("Mock Function Call:", name, data);
      throw new Error("Functions not available in mock mode. Configure Firebase.");
    };
  }
  return functionsInstance.httpsCallable(name);
};
