// Rule-based scoring. No LLM is involved: the same answers always give the same score.
import { MARKS, TEST_LEVELS, TOTAL_MARKS, type TestLevel } from './config';
import type { AttemptQuestion, BucketStats, TestResult, TopicStats } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const emptyBucket = (): BucketStats => ({ total: 0, correct: 0, wrong: 0, skipped: 0, marks: 0, maxMarks: 0 });

export interface ScoringRules {
  negativeMarking: boolean;
  /** Fraction of the question's marks deducted for a wrong answer. */
  negativeMark: number;
}

/**
 * Grades an attempt.
 * - Correct: full marks for the question's difficulty (1 / 2 / 4).
 * - Wrong: 0, or minus (marks × negativeMark) when negative marking is on.
 * - Unanswered: 0.
 * The final score never goes below 0.
 */
export function gradeAttempt(
  questions: AttemptQuestion[],
  answers: Record<string, number>,
  rules: ScoringRules
): TestResult {
  const byDifficulty = Object.fromEntries(TEST_LEVELS.map((l) => [l, emptyBucket()])) as Record<TestLevel, BucketStats>;
  const topics = new Map<string, TopicStats>();
  let raw = 0;
  let negativeMarks = 0;

  for (const q of questions) {
    const marks = MARKS[q.difficulty];
    const bucket = byDifficulty[q.difficulty];
    const topic = topics.get(q.topic) ?? { topic: q.topic, ...emptyBucket() };
    topics.set(q.topic, topic);

    for (const b of [bucket, topic]) {
      b.total += 1;
      b.maxMarks += marks;
    }

    const answer = answers[q.id];
    const answered = Number.isInteger(answer) && answer >= 0 && answer < q.options.length;

    if (!answered) {
      bucket.skipped += 1;
      topic.skipped += 1;
    } else if (answer === q.correct_index) {
      bucket.correct += 1;
      topic.correct += 1;
      bucket.marks += marks;
      topic.marks += marks;
      raw += marks;
    } else {
      bucket.wrong += 1;
      topic.wrong += 1;
      if (rules.negativeMarking && rules.negativeMark > 0) {
        const penalty = marks * rules.negativeMark;
        bucket.marks -= penalty;
        topic.marks -= penalty;
        raw -= penalty;
        negativeMarks += penalty;
      }
    }
  }

  for (const b of [...Object.values(byDifficulty), ...topics.values()]) b.marks = round2(b.marks);

  const sum = (k: 'correct' | 'wrong' | 'skipped') => Object.values(byDifficulty).reduce((n, b) => n + b[k], 0);

  return {
    score: Math.max(0, round2(raw)),
    maxScore: questions.length ? Object.values(byDifficulty).reduce((n, b) => n + b.maxMarks, 0) : TOTAL_MARKS,
    total: questions.length,
    correct: sum('correct'),
    wrong: sum('wrong'),
    skipped: sum('skipped'),
    negativeMarks: round2(negativeMarks),
    byDifficulty,
    byTopic: [...topics.values()].sort((a, b) => a.topic.localeCompare(b.topic)),
  };
}
