
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: REPLACE WITH YOUR FIREBASE PROJECT CONFIGURATION
// 1. Go to console.firebase.google.com
// 2. Create a project
// 3. Register a Web App
// 4. Copy the config object below
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "strength-insight.vercel.app",
  projectId: "gen-lang-client-0337514261",
  storageBucket: "strength-insight.vercel.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:..."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
