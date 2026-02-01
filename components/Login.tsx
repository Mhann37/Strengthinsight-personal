
import React, { useState } from 'react';
import { signInWithGoogle } from '../firebase';
import { BoltIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/solid';

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in. Please check your connection or configuration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 selection:bg-blue-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md space-y-8 animate-fadeIn relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl shadow-2xl shadow-blue-500/20 mb-8 transform hover:scale-105 transition-transform duration-500">
            <span className="text-4xl font-black text-white italic">S</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3 text-shadow-lg">StrengthInsight</h1>
          <p className="text-slate-400 text-lg">AI-powered analytics for your Whoop data.</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-3xl space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-5 bg-slate-950/40 rounded-2xl border border-slate-800/50 group hover:border-blue-500/30 transition-all duration-300">
               <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                 < BoltIcon className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-sm text-slate-200">Vision Analysis</h3>
                 <p className="text-xs text-slate-500">Auto-parse Whoop Trainer logs via AI.</p>
               </div>
            </div>
            <div className="flex items-center space-x-4 p-5 bg-slate-950/40 rounded-2xl border border-slate-800/50 group hover:border-emerald-500/30 transition-all duration-300">
               <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                 <ChartBarIcon className="w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-sm text-slate-200">Advanced Progress</h3>
                 <p className="text-xs text-slate-500">Visual trends for load and volume.</p>
               </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full group flex items-center justify-center space-x-3 bg-white text-slate-950 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-white/5 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm text-center animate-shake">
              {error}
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-slate-600 text-sm flex items-center justify-center space-x-2">
            <SparklesIcon className="w-4 h-4" />
            <span>Join 2,000+ athletes tracking smarter</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
