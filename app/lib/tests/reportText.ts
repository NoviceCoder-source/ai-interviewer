// Pure text for MCQ reports. Numbers always come from the computed result, never from the AI.
import type { TestReport, TestResult } from './types';

export const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/**
 * The factual opening of every summary, built from the computed result — never written by the AI,
 * so marks and question counts can't be mixed up ("14 out of 50 questions").
 */
export function factsSentence(r: TestResult): string {
  const unanswered = r.skipped ? `, ${r.wrong} wrong and ${r.skipped} unanswered` : ` and ${r.wrong} wrong`;
  return `You scored ${r.score} out of ${r.maxScore} marks (${pct(r.score, r.maxScore)}%), answering ${r.correct} of ${r.total} questions correctly${unanswered}.`;
}

/** Template report used when the AI is unavailable. Deterministic. */
export function rulesReport(r: TestResult): TestReport {
  const topics = r.byTopic.filter((t) => t.total > 0);
  const strong = topics.filter((t) => pct(t.correct, t.total) >= 70).map((t) => `${t.topic}: ${t.correct}/${t.total} correct`);
  const weak = topics.filter((t) => pct(t.correct, t.total) < 50).map((t) => `${t.topic}: revise this topic (${t.correct}/${t.total} correct)`);
  const improvements = [...weak];
  if (r.skipped > 0) improvements.push(`${r.skipped} question(s) were left unanswered; manage time so you attempt every question.`);

  return {
    summary: factsSentence(r),
    strengths: strong.length ? strong : ['Keep practising to build strong topics.'],
    improvements: improvements.length ? improvements : ['Try a higher test level to keep improving.'],
    source: 'rules',
  };
}

/** AI lines may not state numbers: counts and percentages come only from factsSentence and the tables. */
export const STATES_A_NUMBER = /\d/;
/** Empty placeholders the model sometimes returns instead of a real point. */
const PLACEHOLDER = /^\s*(none|n\/?a|nil|nothing|-)\s*\.?\s*$/i;

/** Keeps only AI advice lines that contain no numbers and aren't empty placeholders. */
export const keepAdviceLines = (items: string[]) => items.filter((s) => !STATES_A_NUMBER.test(s) && !PLACEHOLDER.test(s));
