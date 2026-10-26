// app/lib/scoreColors.ts
// Score bands shared by every report view.

type Band = 'excellent' | 'good' | 'average' | 'low';

const bandOf = (score: number): Band =>
  score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'average' : 'low';

/** Interviews ended before the minimum are shown as an outright fail rather than a low score. */
const labelOf = (band: Band, endedEarly: boolean) => (endedEarly ? 'Failed' : LABELS[band]);

const LABELS: Record<Band, string> = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  low: 'Needs Work',
};

export interface ScoreColors {
  text: string;
  bg: string;
  label: string;
}

/** Tailwind classes, used by the dark interview / admin report cards. */
export function getScoreColor(score: number, endedEarly = false): ScoreColors {
  const band = bandOf(score);
  const classes: Record<Band, Omit<ScoreColors, 'label'>> = {
    excellent: { text: 'text-emerald-600', bg: 'bg-emerald-500' },
    good: { text: 'text-indigo-600', bg: 'bg-indigo-500' },
    average: { text: 'text-amber-600', bg: 'bg-amber-500' },
    low: { text: 'text-red-600', bg: 'bg-red-500' },
  };
  return { ...classes[band], label: labelOf(band, endedEarly) };
}

export interface ScoreTheme {
  color: string;
  bg: string;
  border: string;
  label: string;
}

/** Inline CSS colors, used by the student dashboard report (follows the white-label secondary color). */
export function getScoreTheme(score: number, endedEarly = false): ScoreTheme {
  const band = bandOf(score);
  const colors: Record<Band, Omit<ScoreTheme, 'label'>> = {
    excellent: { color: '#16A36D', bg: '#F4FFFB', border: '#CCEFE2' },
    good: {
      color: 'var(--color-secondary)',
      bg: 'color-mix(in srgb, var(--color-secondary) 8%, white)',
      border: 'color-mix(in srgb, var(--color-secondary) 25%, white)',
    },
    average: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    low: { color: '#EF3948', bg: '#FFF7F8', border: '#FFD9DD' },
  };
  return { ...colors[band], label: labelOf(band, endedEarly) };
}
