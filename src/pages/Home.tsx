import React from "react";
import { Helmet } from "react-helmet-async";
import "../styles/home.css";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>StrengthInsight — Analyse Your WHOOP Strength Workouts</title>
        <meta
          name="description"
          content="Extract sets, reps & weights from WHOOP Strength Trainer screenshots to track volume, progression & muscle group trends."
        />
        <link rel="canonical" href="https://strengthinsight.app/" />

        {/* Open Graph */}
        <meta property="og:title" content="StrengthInsight — Analyse Your WHOOP Strength Workouts" />
        <meta
          property="og:description"
          content="Upload WHOOP Strength Trainer screenshots. StrengthInsight extracts sets, reps & weights so you can see real progression."
        />
        <meta property="og:url" content="https://strengthinsight.app/" />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
      </Helmet>

      <main className="si-home">
        {/* HERO */}
        <section className="si-hero">
          <div className="si-hero__content">
            <h1 className="si-hero__title">
              Track strength progression from WHOOP Strength Trainer screenshots
            </h1>
            <p className="si-hero__subtitle">
              WHOOP is great for strain. StrengthInsight helps you analyse your lifts — volume, trends,
              and progression — without manual entry or API access.
            </p>

            <div className="si-hero__ctaRow">
              <a className="si-btn si-btn--primary" href="/login">
                Try it free (beta)
              </a>
              <a className="si-btn si-btn--ghost" href="/whoop-strength-trainer-analysis">
                See how it works →
              </a>
            </div>

            <p className="si-hero__trust">
              Secure Google login. Independent companion tool (not affiliated with WHOOP).
            </p>
          </div>

          <div className="si-hero__visual">
            {/* Replace with a real image/GIF when ready */}
            <img
              className="si-hero__image"
              src="/images/home_demo.png"
              alt="StrengthInsight preview showing extracted sets, reps, weight and trends"
              loading="lazy"
            />
          </div>
        </section>

        {/* SOCIAL PROOF / PAIN */}
        <section className="si-section">
          <h2 className="si-section__title">Why StrengthInsight exists</h2>
          <div className="si-grid2">
            <div className="si-card">
              <h3>What WHOOP does well</h3>
              <ul>
                <li>Session strain & effort</li>
                <li>Recovery & readiness context</li>
                <li>Consistency & habit reinforcement</li>
              </ul>
            </div>
            <div className="si-card">
              <h3>Where lifters get stuck</h3>
              <ul>
                <li>Exercise-level progression history</li>
                <li>Week-to-week volume trends</li>
                <li>Seeing what’s actually improving</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3 STEPS */}
        <section className="si-section">
          <h2 className="si-section__title">How it works</h2>
          <div className="si-steps">
            <div className="si-step">
              <div className="si-step__num">1</div>
              <div>
                <h3 className="si-step__title">Upload WHOOP screenshots</h3>
                <p className="si-step__text">No manual typing. Just screenshots from Strength Trainer.</p>
              </div>
            </div>

            <div className="si-step">
              <div className="si-step__num">2</div>
              <div>
                <h3 className="si-step__title">Extract sets, reps & weight</h3>
                <p className="si-step__text">AI reads the workout details WHOOP doesn’t expose via API.</p>
              </div>
            </div>

            <div className="si-step">
              <div className="si-step__num">3</div>
              <div>
                <h3 className="si-step__title">See trends & progression</h3>
                <p className="si-step__text">Track volume, lift history, and muscle group workload over time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE CARDS */}
        <section className="si-section">
          <h2 className="si-section__title">What you get</h2>
          <div className="si-grid3">
            <div className="si-card">
              <h3>Exercise history</h3>
              <p>See how key lifts evolve across weeks — not just session strain.</p>
            </div>
            <div className="si-card">
              <h3>Volume trends</h3>
              <p>Track weekly volume so progression (or plateaus) becomes obvious.</p>
            </div>
            <div className="si-card">
              <h3>Muscle group balance</h3>
              <p>Understand what you’re actually training — and what you’re neglecting.</p>
            </div>
          </div>
        </section>

        {/* FAQ LIGHT */}
        <section className="si-section">
          <h2 className="si-section__title">FAQ</h2>
          <div className="si-faq">
            <details className="si-faq__item">
              <summary>Does WHOOP expose Strength Trainer exercise data via API?</summary>
              <p>
                Not in a way that enables per-exercise progression tracking. StrengthInsight uses screenshot
                extraction instead.
              </p>
            </details>

            <details className="si-faq__item">
              <summary>Do I need to manually enter workouts?</summary>
              <p>No — the goal is zero manual entry. Upload screenshots and review the extracted workout.</p>
            </details>

            <details className="si-faq__item">
              <summary>Is StrengthInsight replacing WHOOP?</summary>
              <p>
                No. WHOOP remains your recovery/strain platform. StrengthInsight complements WHOOP by
                making strength progression easier to analyse.
              </p>
            </details>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="si-cta">
          <h2 className="si-cta__title">Ready to see real strength progress?</h2>
          <p className="si-cta__text">
            Upload WHOOP Strength Trainer screenshots and track progression with less friction.
          </p>
          <a className="si-btn si-btn--primary" href="/login">
            Get started — free (beta)
          </a>
          <p className="si-cta__fineprint">
            Independent project. Not affiliated with WHOOP.
          </p>
        </section>
      </main>
    </>
  );
}
