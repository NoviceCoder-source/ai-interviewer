// Phase 3: adaptive difficulty rules (2 correct in a row -> harder, 2 wrong in a row -> easier).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveStateFrom, adaptiveSummary, applyVerdict, initialState, type InterviewLevel, type Verdict } from '../app/lib/ai/adaptive';
import type { Message } from '../app/lib/types';

const run = (start: InterviewLevel, verdicts: Verdict[]) => verdicts.reduce(applyVerdict, initialState(start));

test('two correct answers in a row move up one level', () => {
  const s = run('Beginner', ['correct', 'correct']);
  assert.equal(s.current, 'Intermediate');
  assert.deepEqual(s.changes, [{ afterAnswer: 2, from: 'Beginner', to: 'Intermediate', direction: 'up' }]);
});

test("two wrong / don't know answers in a row move down one level", () => {
  assert.equal(run('Intermediate', ['wrong', 'wrong']).current, 'Beginner');
  assert.equal(run('Intermediate', ['wrong', 'dont_know']).current, 'Beginner');
});

test('a wrong answer breaks a correct streak, and vice versa', () => {
  assert.equal(run('Beginner', ['correct', 'wrong', 'correct']).current, 'Beginner');
  assert.equal(run('Advanced', ['wrong', 'correct', 'wrong']).current, 'Advanced');
});

test('a partly correct answer resets both streaks', () => {
  assert.equal(run('Beginner', ['correct', 'partial', 'correct']).current, 'Beginner');
  assert.equal(run('Advanced', ['wrong', 'partial', 'wrong']).current, 'Advanced');
});

test('non-answers (off-topic, requests) are ignored and do not break a streak', () => {
  const s = run('Beginner', ['correct', 'not_an_answer', 'correct']);
  assert.equal(s.current, 'Intermediate');
  assert.equal(s.answersJudged, 2);
});

test('levels stop at Beginner and Advanced', () => {
  const low = run('Beginner', ['wrong', 'wrong', 'wrong', 'wrong']);
  assert.equal(low.current, 'Beginner');
  assert.equal(low.changes.length, 0);
  const high = run('Advanced', ['correct', 'correct', 'correct', 'correct']);
  assert.equal(high.current, 'Advanced');
  assert.equal(high.changes.length, 0);
});

test('after a move, two more answers are needed for the next move', () => {
  assert.equal(run('Beginner', ['correct', 'correct', 'correct']).current, 'Intermediate');
});

test('tracks the full journey and the highest level reached', () => {
  const s = run('Beginner', ['correct', 'correct', 'correct', 'correct', 'wrong', 'wrong']);
  assert.deepEqual(s.changes.map((c) => `${c.from}>${c.to}@${c.afterAnswer}`), [
    'Beginner>Intermediate@2', 'Intermediate>Advanced@4', 'Advanced>Intermediate@6',
  ]);
  assert.equal(s.highest, 'Advanced');
  assert.equal(s.current, 'Intermediate');
});

const history: Message[] = [
  { role: 'assistant', content: 'q1', level: 'Beginner' }, { role: 'user', content: 'a', verdict: 'correct' },
  { role: 'assistant', content: 'q2', level: 'Beginner' }, { role: 'user', content: 'b', verdict: 'correct' },
  { role: 'assistant', content: 'q3', level: 'Intermediate' }, { role: 'user', content: 'weather?', verdict: 'not_an_answer' },
  { role: 'assistant', content: 'q3', level: 'Intermediate' }, { role: 'user', content: 'c', verdict: 'wrong' },
  { role: 'assistant', content: 'q4', level: 'Intermediate' },
];

test('replays the stored transcript to find the current level', () => {
  assert.equal(adaptiveStateFrom(history, 'Beginner').current, 'Intermediate');
});

test('report summary from a stored transcript', () => {
  const s = adaptiveSummary(history, 'Beginner')!;
  assert.equal(s.start, 'Beginner');
  assert.equal(s.final, 'Intermediate');
  assert.equal(s.highest, 'Intermediate');
  assert.equal(s.changes.length, 1);
  assert.deepEqual(s.questionLevels, ['Beginner', 'Beginner', 'Intermediate', 'Intermediate', 'Intermediate']);
});

test('no level journey for resume interviews or old interviews without verdicts', () => {
  assert.equal(adaptiveSummary(history, 'Personalized'), null);
  assert.equal(adaptiveSummary([{ role: 'assistant', content: 'q' }, { role: 'user', content: 'a' }], 'Beginner'), null);
});
