import React from 'react';
import type { GeneratedWorkout, GeneratedExercise } from '../../services/generateWorkoutService';

interface WorkoutCardProps {
  workout: GeneratedWorkout;
  recoveryScore?: number;
  daysSinceLastSession?: number;
}

const CARD_WIDTH = 390;

const progressionArrow = (direction: GeneratedExercise['progression_direction']): string => {
  switch (direction) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'rep_increase': return '↑ reps';
    default: return '—';
  }
};

const progressionColor = (direction: GeneratedExercise['progression_direction']): string => {
  switch (direction) {
    case 'up': return '#3b82f6';
    case 'down': return '#f59e0b';
    case 'rep_increase': return '#3b82f6';
    default: return '#64748b';
  }
};

const formatDate = (d: Date): string => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
};

// WorkoutCard renders identically in-browser and as PNG export via html2canvas.
// Uses inline styles throughout to guarantee html2canvas fidelity.
// Fixed width: 390px (iPhone viewport width).
const WorkoutCard = React.forwardRef<HTMLDivElement, WorkoutCardProps>(
  ({ workout, recoveryScore, daysSinceLastSession }, ref) => {
    const today = new Date();
    const dateStr = formatDate(today);

    const styles: Record<string, React.CSSProperties> = {
      card: {
        width: `${CARD_WIDTH}px`,
        backgroundColor: '#0f0f0f',
        borderRadius: '16px',
        padding: '28px',
        fontFamily:
          "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#f1f5f9',
        boxSizing: 'border-box',
      },
      headerRow: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '4px',
      },
      brandLabel: {
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '0.14em',
        color: '#3b82f6',
        textTransform: 'uppercase' as const,
      },
      dateLabel: {
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#64748b',
        textTransform: 'uppercase' as const,
      },
      sessionTitle: {
        fontSize: '22px',
        fontWeight: 800,
        letterSpacing: '-0.01em',
        color: '#f8fafc',
        marginBottom: '10px',
        marginTop: '2px',
      },
      divider: {
        height: '1px',
        backgroundColor: '#1e293b',
        marginBottom: '12px',
      },
      accentDivider: {
        height: '2px',
        background: 'linear-gradient(90deg, #3b82f6 0%, transparent 100%)',
        marginBottom: '14px',
      },
      focusRow: {
        fontSize: '11px',
        fontWeight: 600,
        color: '#64748b',
        letterSpacing: '0.04em',
        marginBottom: '18px',
        textTransform: 'uppercase' as const,
      },
      focusHighlight: {
        color: '#94a3b8',
        fontWeight: 700,
      },
      coachNote: {
        fontSize: '13px',
        fontStyle: 'italic',
        color: '#94a3b8',
        lineHeight: '1.5',
        marginBottom: '18px',
        paddingLeft: '12px',
        borderLeft: '2px solid #3b82f6',
      },
      exerciseRow: {
        paddingTop: '13px',
        paddingBottom: '13px',
      },
      exerciseDivider: {
        height: '1px',
        backgroundColor: '#1a2332',
        marginTop: '0',
        marginBottom: '0',
      },
      exerciseName: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#e2e8f0',
        marginBottom: '5px',
        letterSpacing: '-0.01em',
      },
      exerciseDetails: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      setsReps: {
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
        fontSize: '13px',
        fontWeight: 500,
        color: '#94a3b8',
        letterSpacing: '0.02em',
      },
      weight: {
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
        fontSize: '15px',
        fontWeight: 700,
        color: '#f1f5f9',
        letterSpacing: '-0.01em',
      },
      footer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '20px',
        paddingTop: '14px',
        borderTop: '1px solid #1a2332',
      },
      footerLeft: {
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
        fontSize: '10px',
        fontWeight: 500,
        color: '#334155',
        letterSpacing: '0.04em',
      },
      footerRight: {
        fontSize: '10px',
        fontWeight: 600,
        color: '#334155',
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
      },
    };

    const focusParts: string[] = [`Focus: ${workout.focus}`];
    if (recoveryScore !== undefined) focusParts.push(`Recovery: ${recoveryScore}`);
    if (daysSinceLastSession !== undefined) focusParts.push(`${daysSinceLastSession}d rest`);

    return (
      <div ref={ref} style={styles.card}>
        {/* Header */}
        <div style={styles.headerRow}>
          <span style={styles.brandLabel}>StrengthInsight</span>
          <span style={styles.dateLabel}>{dateStr}</span>
        </div>
        <div style={styles.sessionTitle}>Next Session</div>
        <div style={styles.accentDivider} />

        {/* Focus row */}
        <div style={styles.focusRow}>
          {focusParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ color: '#334155', margin: '0 6px' }}>·</span>}
              <span style={i === 0 ? styles.focusHighlight : undefined}>{part}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Coach note */}
        {workout.coach_note && (
          <div style={styles.coachNote}>"{workout.coach_note}"</div>
        )}

        {/* Exercises */}
        <div>
          {workout.exercises.map((ex, i) => {
            const direction = ex.progression_direction;
            const noteColor = progressionColor(direction);
            const arrow = progressionArrow(direction);
            const noteText =
              direction === 'maintain'
                ? 'maintain'
                : `${ex.progression_note} ${arrow}`;

            return (
              <React.Fragment key={ex.name}>
                {i > 0 && <div style={styles.exerciseDivider} />}
                <div style={styles.exerciseRow}>
                  <div style={styles.exerciseName}>{ex.name}</div>
                  <div style={styles.exerciseDetails}>
                    <span style={styles.setsReps}>
                      {ex.sets} × {ex.reps}
                      {'   '}@{'   '}
                      <span style={styles.weight}>{ex.weight_kg}kg</span>
                    </span>
                    <span
                      style={{
                        fontFamily:
                          "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                        fontSize: '11px',
                        fontWeight: 700,
                        color: noteColor,
                        letterSpacing: '0.04em',
                        textAlign: 'right' as const,
                      }}
                    >
                      {noteText}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerLeft}>
            Est. Volume: {workout.estimated_volume_kg.toLocaleString()}kg
          </span>
          <span style={styles.footerRight}>strengthinsight.app</span>
        </div>
      </div>
    );
  }
);

WorkoutCard.displayName = 'WorkoutCard';
export default WorkoutCard;
