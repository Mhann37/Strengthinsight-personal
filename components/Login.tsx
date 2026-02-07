import React, { useMemo, useState } from 'react';
import { signInWithGoogle } from '../firebase';
import {
  BoltIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/solid';

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
      setError('Failed to sign in. Please check your connection or configuration.');
    } finally {
      setLoading(false);
    }
  };

  // A simple CTA label helper for consistent copy
  const ctaLabel = useMemo(() => (loading ? 'Signing in…' : 'Try it free (beta)'), [loading]);

  return (
    <div className="min-h-screen bg-slate-950 selection:bg-blue-500/30">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[55%] h-[55%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Top area: 2-column landing */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* LEFT: Marketing */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3">
              <img
                src="/icons/icon-120.png"
                alt="StrengthInsight"
                className="w-12 h-12 rounded-2xl shadow-2xl shadow-blue-500/20 object-contain"
              />
              </div>
              <div>
                <div className="text-white font-extrabold tracking-tight text-xl">StrengthInsight</div>
                <div className="text-slate-500 text-sm">Independent WHOOP companion (not affiliated)</div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-[1.05]">
                WHOOP Strength Trainer Analysis — Track Strength Progression Beyond Strain
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-xl">
                WHOOP is great for effort. StrengthInsight helps you track <span className="text-white font-semibold">progression</span>,{' '}
                <span className="text-white font-semibold">volume</span>, and <span className="text-white font-semibold">lift history</span> by
                extracting sets, reps, and weight from your screenshots — no API access and no manual entry.
              </p>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="group inline-flex items-center justify-center gap-2 bg-white text-slate-950 font-bold px-5 py-3 rounded-2xl hover:bg-slate-100 transition-all duration-300 active:scale-[0.99] shadow-lg shadow-white/5 disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>{ctaLabel}</span>
                    <ArrowRightIcon className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-slate-800 text-slate-200 hover:bg-slate-900/40 transition-all"
              >
                See how it works
                <ArrowRightIcon className="w-4 h-4 opacity-70" />
              </a>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <div className="inline-flex items-center gap-2">
                <LockClosedIcon className="w-4 h-4 text-slate-500" />
                Secure Google login
              </div>
              <div className="inline-flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-slate-500" />
                Built as a companion tool
              </div>
              <div className="inline-flex items-center gap-2">
                <SparklesIcon className="w-4 h-4 text-slate-500" />
                Free while in beta
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-shake">
                {error}
              </div>
            )}
          </div>

          {/* RIGHT: Login card / proof image */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-3xl space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-5 bg-slate-950/40 rounded-2xl border border-slate-800/50 group hover:border-blue-500/30 transition-all duration-300">
                <div className="bg-blue-500/10 p-3 rounded-xl text-blue-500 group-hover:scale-110 transition-transform">
                  <ArrowUpTrayIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Upload screenshots</h3>
                  <p className="text-xs text-slate-500">No manual entry. Just your WHOOP Strength Trainer screens.</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-5 bg-slate-950/40 rounded-2xl border border-slate-800/50 group hover:border-emerald-500/30 transition-all duration-300">
                <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500 group-hover:scale-110 transition-transform">
                  <BoltIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">AI extraction</h3>
                  <p className="text-xs text-slate-500">Sets, reps, and weight are parsed automatically.</p>
                </div>
              </div>

              <div className="flex items-center space-x-4 p-5 bg-slate-950/40 rounded-2xl border border-slate-800/50 group hover:border-orange-500/30 transition-all duration-300">
                <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500 group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-200">Progression & trends</h3>
                  <p className="text-xs text-slate-500">Volume, lift history, and muscle group patterns.</p>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full group flex items-center justify-center space-x-3 bg-white text-slate-950 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-white/5 disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-4 text-center text-xs text-slate-500">
              By continuing, you agree to StrengthInsight’s{' '}
              <a
                href="/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Privacy Policy
              </a>
              .
            </div>

            <div className="pt-4 border-t border-slate-800/50">
              <p className="text-xs text-slate-500 leading-relaxed text-center">
                StrengthInsight is an independent community project and is not affiliated with WHOOP. Upload only your own
                screenshots.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll sections */}
      <div id="how-it-works" className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="mt-10 border-t border-slate-800/60 pt-14">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4">
            How StrengthInsight works
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
            WHOOP doesn’t currently expose per-exercise Strength Trainer data via API. StrengthInsight uses screenshots so you can
            still track progression and volume over time.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
              <div className="text-blue-400 font-black text-2xl">1</div>
              <h3 className="text-white font-bold mt-2">Upload screenshots</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Grab your workout screenshots from WHOOP Strength Trainer — no spreadsheets, no typing.
              </p>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
              <div className="text-emerald-400 font-black text-2xl">2</div>
              <h3 className="text-white font-bold mt-2">Extract workout data</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                StrengthInsight reads sets, reps, and weight, then lets you review/edit before saving.
              </p>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
              <div className="text-orange-400 font-black text-2xl">3</div>
              <h3 className="text-white font-bold mt-2">See progression</h3>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Track volume trends, lift history, and muscle group balance — the stuff that makes progress visible.
              </p>
            </div>
          </div>

          <div className="mt-10">
  <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4">
    What WHOOP Strength Trainer shows (and what it doesn’t)
  </h2>
  <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
    WHOOP does a strong job capturing session-level effort. Where many lifters get stuck is analysing strength progression at the exercise level.
  </p>

  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-white font-bold">What WHOOP does well</h3>
      <ul className="mt-3 space-y-2 text-slate-400 text-sm leading-relaxed list-disc pl-5">
        <li>Session strain & effort context</li>
        <li>Recovery/readiness insights around training</li>
        <li>Consistency and training frequency</li>
      </ul>
    </div>

    <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-white font-bold">Where analysis is limited</h3>
      <ul className="mt-3 space-y-2 text-slate-400 text-sm leading-relaxed list-disc pl-5">
        <li>Per-exercise lift history over time</li>
        <li>Week-to-week volume trends by movement</li>
        <li>Clear progression views (load/volume per lift)</li>
        <li>Simple export of workout details</li>
      </ul>
    </div>
  </div>
</div>

   <div className="mt-10">
  <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4">
    Why strength progression matters
  </h2>
  <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
    Strain can tell you how hard a session felt. Progress shows up in trends — like increasing volume, improving reps at the same load, or gradually lifting more over time.
  </p>

  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-white font-bold">Volume trends</h3>
      <p className="text-slate-400 text-sm mt-2 leading-relaxed">
        See whether you’re doing more meaningful work each week — or unknowingly plateauing.
      </p>
    </div>
    <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-white font-bold">Progressive overload</h3>
      <p className="text-slate-400 text-sm mt-2 leading-relaxed">
        Track key lifts so improvements are obvious, not guesswork.
      </p>
    </div>
    <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6">
      <h3 className="text-white font-bold">Muscle group balance</h3>
      <p className="text-slate-400 text-sm mt-2 leading-relaxed">
        Understand what you’re really training over time — and what’s being neglected.
      </p>
    </div>
  </div>
</div>

          
          {/* Proof image you already have in your repo */}
          <div className="mt-10 bg-slate-950/40 p-6 rounded-3xl border border-slate-800">
            <img
              src="/examples/whoop-strength-example.jpg"
              alt="WHOOP Strength Trainer screenshot extraction example"
              className="w-full rounded-2xl border border-slate-800 shadow-2xl"
              loading="lazy"
            />
            <p className="text-slate-500 text-sm mt-3">
              <p className="text-slate-500 text-sm leading-relaxed max-w-3xl">
            StrengthInsight was built by a long-time WHOOP user to better understand strength
            progression and training volume. It is an independent project and is not affiliated
            with WHOOP.
            </p>
            </p>
          </div>

          {/* Final CTA */}
          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/30 p-8 text-center">
            <h3 className="text-white text-2xl font-extrabold tracking-tight">
              Ready to see real strength progress?
            </h3>
            <p className="text-slate-400 mt-2 max-w-2xl mx-auto">
              Sign in and try StrengthInsight free while it’s in beta.
            </p>

            <div className="mt-5 flex justify-center">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="group inline-flex items-center justify-center gap-2 bg-white text-slate-950 font-bold px-6 py-3 rounded-2xl hover:bg-slate-100 transition-all duration-300 active:scale-[0.99] shadow-lg shadow-white/5 disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Get started</span>
                    <ArrowRightIcon className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>

            <p className="text-slate-500 text-xs mt-4">
              Independent project. Not affiliated with WHOOP.
            </p>
          </div>

          <div className="mt-10">
  <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4">
    Frequently asked questions
  </h2>

  <div className="grid grid-cols-1 gap-3 max-w-3xl">
    <details className="bg-slate-950/40 border border-slate-800 rounded-3xl p-5">
      <summary className="cursor-pointer text-white font-bold">
        Does WHOOP expose Strength Trainer data via API?
      </summary>
      <p className="text-slate-400 text-sm mt-3 leading-relaxed">
        WHOOP does not currently expose per-exercise Strength Trainer data via API in a way that enables progression tracking.
        StrengthInsight uses screenshot extraction instead.
      </p>
    </details>

    <details className="bg-slate-950/40 border border-slate-800 rounded-3xl p-5">
      <summary className="cursor-pointer text-white font-bold">
        Do I need to manually enter workouts?
      </summary>
      <p className="text-slate-400 text-sm mt-3 leading-relaxed">
        No. StrengthInsight avoids manual entry by extracting workout data directly from WHOOP Strength Trainer screenshots.
      </p>
    </details>

    <details className="bg-slate-950/40 border border-slate-800 rounded-3xl p-5">
      <summary className="cursor-pointer text-white font-bold">
        Is StrengthInsight affiliated with WHOOP?
      </summary>
      <p className="text-slate-400 text-sm mt-3 leading-relaxed">
        No. StrengthInsight is an independent companion tool and is not affiliated with WHOOP.
      </p>
    </details>
  </div>
</div>

        </div>
      </div>
    </div>
  );
};

export default Login;
