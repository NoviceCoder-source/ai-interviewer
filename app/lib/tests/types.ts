import type { TestLevel } from './config';

/** A question as stored on the attempt (server only — it carries the correct answer). */
export interface AttemptQuestion {
  id: string;
  topic: string;
  difficulty: TestLevel;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string | null;
}

/** What the browser receives while the test is running: no correct answers. */
export type PublicQuestion = Omit<AttemptQuestion, 'correct_index' | 'explanation'>;

export type SubmitReason = 'manual' | 'time_up' | 'tab_switch_limit' | 'away_timeout' | 'left_test';

export interface BucketStats {
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  marks: number;
  maxMarks: number;
}

export interface TopicStats extends BucketStats {
  topic: string;
}

export interface TestResult {
  score: number;
  maxScore: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  negativeMarks: number;
  byDifficulty: Record<TestLevel, BucketStats>;
  byTopic: TopicStats[];
}

export interface TestReport {
  summary: string;
  strengths: string[];
  improvements: string[];
  /** 'ai' when written by the LLM, 'rules' when the template fallback was used. */
  source: 'ai' | 'rules';
}

export interface ProctorEntry {
  type: 'leave' | 'return' | 'auto_submit';
  at: string;
  awaySeconds?: number;
  detail?: string;
}

/** Running test as returned by GET /api/tests/:id. */
export interface RunningTest {
  id: string;
  subject: string;
  topic_name: string | null;
  level: TestLevel;
  status: 'in_progress' | 'submitted';
  questions: PublicQuestion[];
  answers: Record<string, number>;
  deadline: string;
  serverNow: string;
  tab_switches: number;
  negative_marking: boolean;
  negative_mark: number;
}

/** Finished test (student or admin view). */
export interface FinishedTest {
  id: string;
  subject: string;
  topic_name: string | null;
  level: TestLevel;
  started_at: string;
  submitted_at: string | null;
  submit_reason: SubmitReason | null;
  tab_switches: number;
  proctor_log: ProctorEntry[];
  negative_marking: boolean;
  negative_mark: number;
  credit_cost: number;
  questions: AttemptQuestion[];
  answers: Record<string, number>;
  result: TestResult;
  report: TestReport | null;
  student?: { full_name: string; email: string } | null;
}

/** Row in a list of tests. */
export interface TestSummary {
  id: string;
  subject: string;
  topic_name: string | null;
  level: TestLevel;
  status: 'in_progress' | 'submitted';
  created_at: string;
  submit_reason: SubmitReason | null;
  tab_switches: number;
  score: number | null;
  student?: { full_name: string; email: string } | null;
}
