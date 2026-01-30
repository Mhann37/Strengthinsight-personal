
import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { BoltIcon, ChartBarIcon } from '@heroicons/react/24/solid';

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/configuration-not-found') {
        setError("Firebase config missing. Please check firebase.ts");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-white text-3xl mx-auto mb-6 shadow-2xl shadow-blue-900/40">
            S
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">StrengthInsight</h1>
          <p className="text-slate-400">Your AI-powered strength companion.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
               <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500">
                 <BoltIcon className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-sm">Vision Analysis</h3>
                 <p className="text-xs text-slate-400">Upload Whoop screenshots directly.</p>
               </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50">
               <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
                 <ChartBarIcon className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-sm">Cloud Sync</h3>
                 <p className="text-xs text-slate-400">Access your history from any device.</p>
               </div>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
