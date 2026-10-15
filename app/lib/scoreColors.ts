// app/lib/scoreColors.ts

export interface ScoreColors {
  text: string;
  bg: string;
  label: string;
}

export function getScoreColor(score: number): ScoreColors {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', label: 'Excellent' };
  if (score >= 60) return { text: 'text-indigo-600', bg: 'bg-indigo-500', label: 'Good' };
  if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500', label: 'Average' };
  return { text: 'text-red-600', bg: 'bg-red-500', label: 'Needs Work' };
}