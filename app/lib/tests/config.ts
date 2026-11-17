// Fixed rules of the MCQ test format. Pure — safe to import from client and server.

export const TEST_LEVELS = ['basic', 'intermediate', 'advanced'] as const;
export type TestLevel = (typeof TEST_LEVELS)[number];

export const LEVEL_LABELS: Record<TestLevel, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Marks per question by question difficulty. */
export const MARKS: Record<TestLevel, number> = { basic: 1, intermediate: 2, advanced: 4 };

export const TOTAL_MARKS = 50;
export const MIN_QUESTIONS = 20;

/** Anti-cheating limits. */
export const MAX_TAB_SWITCHES = 5;
export const AWAY_LIMIT_SECONDS = 20;

export interface QuestionMix {
  basic: number;
  intermediate: number;
  advanced: number;
}

export interface TestConfig {
  level: TestLevel;
  basic_count: number;
  intermediate_count: number;
  advanced_count: number;
  duration_minutes: number;
  negative_marking: boolean;
  negative_mark: number;
  credit_cost: number;
}

export const isTestLevel = (value: unknown): value is TestLevel =>
  typeof value === 'string' && (TEST_LEVELS as readonly string[]).includes(value);

export const mixOf = (c: Pick<TestConfig, 'basic_count' | 'intermediate_count' | 'advanced_count'>): QuestionMix => ({
  basic: c.basic_count,
  intermediate: c.intermediate_count,
  advanced: c.advanced_count,
});

export const mixMarks = (m: QuestionMix) => m.basic * MARKS.basic + m.intermediate * MARKS.intermediate + m.advanced * MARKS.advanced;
export const mixCount = (m: QuestionMix) => m.basic + m.intermediate + m.advanced;

/** Returns an error message, or null when the mix is valid (exactly 50 marks, at least 20 questions). */
export function validateMix(m: QuestionMix): string | null {
  const values = [m.basic, m.intermediate, m.advanced];
  if (values.some((v) => !Number.isInteger(v) || v < 0)) return 'Question counts must be whole numbers of 0 or more.';
  const marks = mixMarks(m);
  if (marks !== TOTAL_MARKS) return `The mix totals ${marks} marks; it must total exactly ${TOTAL_MARKS}.`;
  const count = mixCount(m);
  if (count < MIN_QUESTIONS) return `The mix has ${count} questions; a test needs at least ${MIN_QUESTIONS}.`;
  return null;
}

/** Accepts the difficulty spellings admins are likely to type in a spreadsheet. */
export function parseDifficulty(raw: string): TestLevel | null {
  const v = raw.trim().toLowerCase();
  if (['basic', 'beginner', 'easy', 'simple'].includes(v)) return 'basic';
  if (['intermediate', 'medium', 'moderate'].includes(v)) return 'intermediate';
  if (['advanced', 'advance', 'hard', 'expert'].includes(v)) return 'advanced';
  return null;
}

export const SUBMIT_REASON_LABELS: Record<string, string> = {
  manual: 'Submitted by the student',
  time_up: 'Auto-submitted: time ran out',
  tab_switch_limit: `Auto-submitted: ${MAX_TAB_SWITCHES} tab or window switches`,
  away_timeout: `Auto-submitted: away from the test for more than ${AWAY_LIMIT_SECONDS} seconds`,
  left_test: 'Student left the test; graded on answers given so far',
};
