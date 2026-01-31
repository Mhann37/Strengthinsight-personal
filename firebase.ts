
// Modular Firebase initialization with LocalStorage fallback for offline-first resilience
// Removed unused FirebaseApp to resolve potential export missing error in specific environments
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  Auth, 
  onAuthStateChanged as fbOnAuthStateChanged,
  signOut as fbSignOut,
  signInWithPopup as fbSignInWithPopup,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  Firestore, 
  collection as fbCollection,
  addDoc as fbAddDoc,
  deleteDoc as fbDeleteDoc,
  doc as fbDoc,
  onSnapshot as fbOnSnapshot,
  query as fbQuery,
  where as fbWhere
} from "firebase/firestore";

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

let app: any;
let auth: any;
let db: any;

if (isConfigValid) {
  try {
    // initializeApp is the standard entry point for Firebase modular SDK
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
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
  const mockUser: User = {
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
  } as any;

  // Mock Auth
  auth = {
    currentUser: mockUser,
  };

  // Mock DB (using LocalStorage)
  db = { isMock: true };
}

export { auth, db };
export const googleProvider = new GoogleAuthProvider();

// Standardized wrappers to handle both Real Firebase and Mock Persistence
export const onAuthStateChanged = (authObj: any, callback: (user: User | null) => void) => {
  if (db.isMock) {
    // Simulate async auth load
    setTimeout(() => callback(authObj.currentUser), 500);
    return () => {};
  }
  return fbOnAuthStateChanged(authObj, callback);
};

export const signOut = (authObj: any) => {
  if (db.isMock) {
    authObj.currentUser = null;
    window.location.reload(); // Hard reset for mock
    return Promise.resolve();
  }
  return fbSignOut(authObj);
};

export const signInWithPopup = (authObj: any, provider: any) => {
  if (db.isMock) {
    setupMocks(); // Re-initialize
    window.location.reload();
    return Promise.resolve();
  }
  return fbSignInWithPopup(authObj, provider);
};

// Firestore Mocks/Wrappers
export const collection = (dbObj: any, path: string) => {
  if (dbObj.isMock) return { path, isMock: true };
  return fbCollection(dbObj, path);
};

export const doc = (dbObj: any, path: string, id: string) => {
  if (dbObj.isMock) return { path, id, isMock: true };
  return fbDoc(dbObj, path, id);
};

export const query = (col: any, ...constraints: any[]) => {
  if (col.isMock) return col;
  return fbQuery(col, ...constraints);
};

export const where = (field: string, op: string, val: any) => {
  if (typeof fbWhere === 'function') return fbWhere(field, op as any, val);
  return { field, op, val };
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
  return fbOnSnapshot(q, callback, errorCallback);
};

export const addDoc = (col: any, data: any) => {
  if (col.isMock) {
    const existing = JSON.parse(localStorage.getItem(`mock_db_${col.path}`) || '[]');
    const newDoc = { ...data, id: `local-${Date.now()}` };
    localStorage.setItem(`mock_db_${col.path}`, JSON.stringify([...existing, newDoc]));
    window.dispatchEvent(new Event('storage')); // Trigger listeners
    return Promise.resolve(newDoc);
  }
  return fbAddDoc(col, data);
};

export const deleteDoc = (docRef: any) => {
  if (docRef.isMock) {
    const existing = JSON.parse(localStorage.getItem(`mock_db_${docRef.path}`) || '[]');
    const filtered = existing.filter((item: any) => item.id !== docRef.id);
    localStorage.setItem(`mock_db_${docRef.path}`, JSON.stringify(filtered));
    window.dispatchEvent(new Event('storage'));
    return Promise.resolve();
  }
  return fbDeleteDoc(docRef);
};
