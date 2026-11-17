// Server-side data access for MCQ tests (service role). Never import from a 'use client' file.
import { supabaseAdmin } from '../supabase/admin';
import { writeTestReport } from '../ai/testReport';
import { AWAY_LIMIT_SECONDS, LEVEL_LABELS, MAX_TAB_SWITCHES, TEST_LEVELS, type TestConfig, type TestLevel } from './config';
import { gradeAttempt } from './scoring';
import type {
  AttemptQuestion, FinishedTest, ProctorEntry, RunningTest, SubmitReason, TestResult, TestReport,
} from './types';

/** Seconds of slack for network delay around the deadline. */
const DEADLINE_GRACE_MS = 5000;

export interface AttemptRow {
  id: string;
  user_id: string;
  subject: string;
  topic_id: string | null;
  topic_name: string | null;
  level: TestLevel;
  questions: AttemptQuestion[];
  answers: Record<string, number>;
  status: 'in_progress' | 'submitted';
  started_at: string;
  deadline: string;
  submitted_at: string | null;
  submit_reason: SubmitReason | null;
  tab_switches: number;
  away_since: string | null;
  proctor_log: ProctorEntry[];
  negative_marking: boolean;
  negative_mark: number;
  credit_cost: number;
  result: TestResult | null;
  report: TestReport | null;
  created_at: string;
}

const ATTEMPT_COLUMNS =
  'id, user_id, subject, topic_id, topic_name, level, questions, answers, status, started_at, deadline, submitted_at, submit_reason, tab_switches, away_since, proctor_log, negative_marking, negative_mark, credit_cost, result, report, created_at';

const normalizeRow = (row: AttemptRow): AttemptRow => ({ ...row, negative_mark: Number(row.negative_mark) });

export async function getTestConfigs(): Promise<Record<TestLevel, TestConfig>> {
  const { data, error } = await supabaseAdmin.from('test_configs').select('*');
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((c) => [c.level, { ...c, negative_mark: Number(c.negative_mark) }]));
  for (const level of TEST_LEVELS) if (!map[level]) throw new Error(`Missing test_configs row for "${level}". Run the Phase 1 migration.`);
  return map as Record<TestLevel, TestConfig>;
}

/** Price of a test: per-subject override if the admin set one, else the level default. */
export async function getCreditCost(subject: string, level: TestLevel, config: TestConfig): Promise<number> {
  const { data } = await supabaseAdmin.from('credit_costs').select('cost').eq('subject', subject).eq('level', level).maybeSingle();
  return data?.cost ?? config.credit_cost;
}

export async function getAttempt(id: string, userId?: string): Promise<AttemptRow | null> {
  let query = supabaseAdmin.from('test_attempts').select(ATTEMPT_COLUMNS).eq('id', id);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? normalizeRow(data as AttemptRow) : null;
}

export const isPastDeadline = (a: AttemptRow, now = Date.now()) => now > new Date(a.deadline).getTime() + DEADLINE_GRACE_MS;

/**
 * Grades and closes an attempt. Safe to call twice: only the first call wins, later calls
 * return the stored result. The LLM summary is written after the score is saved, so a slow or
 * failing model can never block or change grading.
 */
export async function finalizeAttempt(attempt: AttemptRow, reason: SubmitReason, extraLog: ProctorEntry[] = []): Promise<AttemptRow> {
  if (attempt.status === 'submitted') return attempt;

  const result = gradeAttempt(attempt.questions, attempt.answers, {
    negativeMarking: attempt.negative_marking,
    negativeMark: attempt.negative_mark,
  });
  const nowIso = new Date().toISOString();
  const log = [...attempt.proctor_log, ...extraLog];
  if (reason !== 'manual') log.push({ type: 'auto_submit', at: nowIso, detail: reason });

  const { data: claimed, error } = await supabaseAdmin
    .from('test_attempts')
    .update({
      status: 'submitted',
      submitted_at: nowIso,
      submit_reason: reason,
      result,
      proctor_log: log,
      tab_switches: attempt.tab_switches,
      away_since: null,
    })
    .eq('id', attempt.id)
    .eq('status', 'in_progress')
    .select(ATTEMPT_COLUMNS)
    .maybeSingle();
  if (error) throw error;

  if (!claimed) {
    // Another request finished it first.
    const latest = await getAttempt(attempt.id);
    if (!latest) throw new Error('Attempt disappeared while submitting.');
    return latest;
  }

  const report = await writeTestReport(attempt.subject, LEVEL_LABELS[attempt.level], result);
  const { error: reportError } = await supabaseAdmin.from('test_attempts').update({ report }).eq('id', attempt.id);
  if (reportError) console.error('[tests] could not save report', reportError.message);

  return { ...normalizeRow(claimed as AttemptRow), report };
}

/**
 * Applies the server-side rules that can end a test without the student clicking anything:
 * time running out, and being away longer than the limit. Returns the (possibly finalized) attempt.
 */
export async function enforceRules(attempt: AttemptRow, { treatAsReturn = false } = {}): Promise<AttemptRow> {
  if (attempt.status === 'submitted') return attempt;
  if (isPastDeadline(attempt)) return finalizeAttempt(attempt, 'time_up');

  if (attempt.away_since) {
    const awaySeconds = (Date.now() - new Date(attempt.away_since).getTime()) / 1000;
    if (awaySeconds > AWAY_LIMIT_SECONDS) {
      return finalizeAttempt(attempt, 'away_timeout', [
        { type: 'return', at: new Date().toISOString(), awaySeconds: Math.round(awaySeconds) },
      ]);
    }
    if (treatAsReturn) {
      const log = [...attempt.proctor_log, { type: 'return' as const, at: new Date().toISOString(), awaySeconds: Math.round(awaySeconds) }];
      await supabaseAdmin.from('test_attempts').update({ away_since: null, proctor_log: log }).eq('id', attempt.id).eq('status', 'in_progress');
      return { ...attempt, away_since: null, proctor_log: log };
    }
  }
  return attempt;
}

/**
 * Records a proctoring event reported by the browser.
 * - leave:  counts a tab/window switch; the MAX_TAB_SWITCHES-th one submits the test.
 * - return: away time is measured on the server; more than AWAY_LIMIT_SECONDS submits the test.
 * - check:  sent by the browser when its own 20-second countdown runs out while still away.
 */
export async function recordProctorEvent(attempt: AttemptRow, event: 'leave' | 'return' | 'check'): Promise<AttemptRow> {
  const current = await enforceRules(attempt);
  if (current.status === 'submitted') return current;
  const nowIso = new Date().toISOString();

  if (event === 'leave') {
    if (current.away_since) return current; // already away (blur + hidden fire together)
    const switches = current.tab_switches + 1;
    const log: ProctorEntry[] = [...current.proctor_log, { type: 'leave', at: nowIso, detail: `switch ${switches} of ${MAX_TAB_SWITCHES}` }];

    if (switches >= MAX_TAB_SWITCHES) {
      return finalizeAttempt({ ...current, tab_switches: switches, proctor_log: log }, 'tab_switch_limit');
    }

    const { error } = await supabaseAdmin
      .from('test_attempts')
      .update({ tab_switches: switches, away_since: nowIso, proctor_log: log })
      .eq('id', current.id)
      .eq('status', 'in_progress');
    if (error) throw error;
    return { ...current, tab_switches: switches, away_since: nowIso, proctor_log: log };
  }

  // return / check: enforceRules already submitted the test if the student was away too long.
  if (event === 'return') return enforceRules(current, { treatAsReturn: true });
  return current;
}

export function toRunningTest(a: AttemptRow): RunningTest {
  return {
    id: a.id,
    subject: a.subject,
    topic_name: a.topic_name,
    level: a.level,
    status: a.status,
    // Never send correct answers or explanations to the browser while the test runs.
    questions: a.questions.map(({ id, topic, difficulty, question, options }) => ({ id, topic, difficulty, question, options })),
    answers: a.answers,
    deadline: a.deadline,
    serverNow: new Date().toISOString(),
    tab_switches: a.tab_switches,
    negative_marking: a.negative_marking,
    negative_mark: a.negative_mark,
  };
}

export function toFinishedTest(a: AttemptRow, student?: { full_name: string; email: string } | null): FinishedTest {
  return {
    id: a.id,
    subject: a.subject,
    topic_name: a.topic_name,
    level: a.level,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    submit_reason: a.submit_reason,
    tab_switches: a.tab_switches,
    proctor_log: a.proctor_log,
    negative_marking: a.negative_marking,
    negative_mark: a.negative_mark,
    credit_cost: a.credit_cost,
    questions: a.questions,
    answers: a.answers,
    result: a.result!,
    report: a.report,
    ...(student !== undefined ? { student } : {}),
  };
}

/** Closes any of the student's tests whose time ran out while they were away. */
export async function closeExpiredAttempts(userId?: string) {
  let query = supabaseAdmin
    .from('test_attempts')
    .select(ATTEMPT_COLUMNS)
    .eq('status', 'in_progress')
    .lt('deadline', new Date(Date.now() - DEADLINE_GRACE_MS).toISOString());
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.limit(50);
  if (error) throw error;
  for (const row of data ?? []) await finalizeAttempt(normalizeRow(row as AttemptRow), 'time_up');
}
