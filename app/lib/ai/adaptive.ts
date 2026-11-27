// Adaptive difficulty for AI interviews (Phase 3).
// The AI only labels each answer (a "verdict"); moving between levels is plain code:
//   2 correct answers in a row  -> one level harder
//   2 wrong / "don't know" in a row -> one level easier
// Pure — safe to import from client and server.
import type { Message } from '../types';

export const INTERVIEW_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type InterviewLevel = (typeof INTERVIEW_LEVELS)[number];

export const VERDICTS = ['correct', 'partial', 'wrong', 'dont_know', 'not_an_answer'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Answers needed in a row before the level moves. */
export const STREAK_TO_CHANGE = 2;

export const isInterviewLevel = (v: unknown): v is InterviewLevel =>
  typeof v === 'string' && (INTERVIEW_LEVELS as readonly string[]).includes(v);

export interface LevelChange {
  /** 1-based number of the answer that triggered the change. */
  afterAnswer: number;
  from: InterviewLevel;
  to: InterviewLevel;
  direction: 'up' | 'down';
}

export interface AdaptiveState {
  start: InterviewLevel;
  current: InterviewLevel;
  highest: InterviewLevel;
  correctStreak: number;
  wrongStreak: number;
  changes: LevelChange[];
  /** Number of judged answers (verdicts other than not_an_answer). */
  answersJudged: number;
}

const rank = (l: InterviewLevel) => INTERVIEW_LEVELS.indexOf(l);

/** Applies one verdict to the state. Returns a new state; never mutates. */
export function applyVerdict(state: AdaptiveState, verdict: Verdict): AdaptiveState {
  if (verdict === 'not_an_answer') return state;
  const next: AdaptiveState = { ...state, changes: [...state.changes], answersJudged: state.answersJudged + 1 };

  if (verdict === 'correct') {
    next.correctStreak += 1;
    next.wrongStreak = 0;
  } else if (verdict === 'wrong' || verdict === 'dont_know') {
    next.wrongStreak += 1;
    next.correctStreak = 0;
  } else {
    // partly correct: neither a success nor a failure, so both streaks restart
    next.correctStreak = 0;
    next.wrongStreak = 0;
  }

  const i = rank(next.current);
  if (next.correctStreak >= STREAK_TO_CHANGE) {
    next.correctStreak = 0;
    if (i < INTERVIEW_LEVELS.length - 1) {
      const to = INTERVIEW_LEVELS[i + 1];
      next.changes.push({ afterAnswer: next.answersJudged, from: next.current, to, direction: 'up' });
      next.current = to;
    }
  } else if (next.wrongStreak >= STREAK_TO_CHANGE) {
    next.wrongStreak = 0;
    if (i > 0) {
      const to = INTERVIEW_LEVELS[i - 1];
      next.changes.push({ afterAnswer: next.answersJudged, from: next.current, to, direction: 'down' });
      next.current = to;
    }
  }
  if (rank(next.current) > rank(next.highest)) next.highest = next.current;
  return next;
}

export const initialState = (start: InterviewLevel): AdaptiveState => ({
  start, current: start, highest: start, correctStreak: 0, wrongStreak: 0, changes: [], answersJudged: 0,
});

/** Replays the verdicts stored on the candidate's messages to get the current level. */
export function adaptiveStateFrom(history: Message[], start: InterviewLevel): AdaptiveState {
  return history.reduce(
    (state, m) => (m.role === 'user' && m.verdict ? applyVerdict(state, m.verdict) : state),
    initialState(start)
  );
}

/** Report data, or null for interviews without levels (e.g. resume interviews, or old interviews). */
export function adaptiveSummary(history: Message[], difficulty: string) {
  if (!isInterviewLevel(difficulty) || !history.some((m) => m.role === 'user' && m.verdict)) return null;
  const s = adaptiveStateFrom(history, difficulty);
  const questionLevels = history.filter((m) => m.role === 'assistant' && m.level).map((m) => m.level!);
  return { start: s.start, final: s.current, highest: s.highest, changes: s.changes, questionLevels };
}

export type AdaptiveSummary = NonNullable<ReturnType<typeof adaptiveSummary>>;
