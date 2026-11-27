// Phase 1 MCQ engine: test format, scoring, random selection, CSV upload checks, duplicates, levels, report text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMix, parseDifficulty } from '../app/lib/tests/config';
import { gradeAttempt } from '../app/lib/tests/scoring';
import { pickQuestions } from '../app/lib/tests/selection';
import { normalizeQuestion, similarity, NEAR_DUPLICATE_THRESHOLD } from '../app/lib/tests/similarity';
import { parseCsv, validateQuestionRows } from '../app/lib/tests/csv';
import { computeLevelProgress, cleanRequirements, type CompletedTest, type StudentLevel } from '../app/lib/tests/levels';
import { factsSentence, keepAdviceLines } from '../app/lib/tests/reportText';
import type { AttemptQuestion } from '../app/lib/tests/types';

test('default mixes total exactly 50 marks with at least 20 questions', () => {
  for (const [basic, intermediate, advanced] of [[24, 7, 3], [14, 8, 5], [6, 6, 8]]) {
    assert.equal(validateMix({ basic, intermediate, advanced }), null);
  }
  assert.match(validateMix({ basic: 10, intermediate: 10, advanced: 10 })!, /exactly 50/);
  assert.match(validateMix({ basic: 2, intermediate: 4, advanced: 10 })!, /at least 20/);
  assert.equal(parseDifficulty('Easy'), 'basic');
  assert.equal(parseDifficulty('hard'), 'advanced');
  assert.equal(parseDifficulty('expert-ish'), null);
});

const Q: AttemptQuestion[] = [
  { id: '1', topic: 'T1', difficulty: 'basic', question: 'q', options: ['a', 'b'], correct_index: 0 },
  { id: '2', topic: 'T1', difficulty: 'intermediate', question: 'q', options: ['a', 'b'], correct_index: 1 },
  { id: '3', topic: 'T2', difficulty: 'advanced', question: 'q', options: ['a', 'b', 'c'], correct_index: 2 },
  { id: '4', topic: 'T2', difficulty: 'advanced', question: 'q', options: ['a', 'b', 'c'], correct_index: 2 },
];

test('scoring: 1/2/4 marks, unanswered = 0', () => {
  const r = gradeAttempt(Q, { 1: 0, 2: 0, 3: 2 }, { negativeMarking: false, negativeMark: 0.25 });
  assert.deepEqual([r.score, r.correct, r.wrong, r.skipped, r.maxScore], [5, 2, 1, 1, 11]);
});

test('scoring: negative marking deducts marks × fraction', () => {
  const r = gradeAttempt(Q, { 1: 0, 2: 0, 3: 2 }, { negativeMarking: true, negativeMark: 0.25 });
  assert.equal(r.score, 4.5);
  assert.equal(r.negativeMarks, 0.5);
  assert.equal(r.byDifficulty.intermediate.marks, -0.5);
});

test('scoring: never below zero; out-of-range answers count as unanswered', () => {
  assert.equal(gradeAttempt(Q, { 1: 1, 2: 0, 3: 0, 4: 0 }, { negativeMarking: true, negativeMark: 1 }).score, 0);
  assert.equal(gradeAttempt(Q, { 1: 7, 2: -1 }, { negativeMarking: true, negativeMark: 1 }).skipped, 4);
});

test('selection: exact mix, no repeats; reports shortages', () => {
  let seed = 42;
  const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pool = [
    ...Array.from({ length: 30 }, (_, k) => ({ id: `b${k}`, difficulty: 'basic' as const })),
    ...Array.from({ length: 10 }, (_, k) => ({ id: `i${k}`, difficulty: 'intermediate' as const })),
    ...Array.from({ length: 4 }, (_, k) => ({ id: `a${k}`, difficulty: 'advanced' as const })),
  ];
  const ok = pickQuestions(pool, { basic: 24, intermediate: 7, advanced: 3 }, rng);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.questions.length, 34);
    assert.equal(new Set(ok.questions.map((q) => q.id)).size, 34);
  }
  const short = pickQuestions(pool, { basic: 6, intermediate: 6, advanced: 8 }, rng);
  assert.ok(!short.ok);
  if (!short.ok) assert.deepEqual(short.shortages, [{ difficulty: 'advanced', needed: 8, available: 4 }]);
});

test('duplicates: code symbols matter, rewordings are flagged', () => {
  assert.notEqual(normalizeQuestion('What does a[1:] return?'), normalizeQuestion('What does a[:1] return?'));
  assert.ok(similarity(normalizeQuestion('What is the output of 7 // 2?'), normalizeQuestion('What is the result of 7 // 2?')) >= NEAR_DUPLICATE_THRESHOLD);
  assert.ok(similarity(normalizeQuestion('What does SELECT do?'), normalizeQuestion('What does a LEFT JOIN return?')) < NEAR_DUPLICATE_THRESHOLD);
});

test('CSV: quoted fields, case-sensitive options, row errors with line numbers', () => {
  const text = '﻿Subject,Topic,Difficulty,Question,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation\r\n' +
    'python,Basics,easy,"What does ""len"" return, exactly?",count,"size, in bytes",,,A,\r\n' +
    'Python,Basics,hard,Q2,a,b,,d,B,\r\n' +
    'Java,Basics,basic,Q3,a,b,,,A,\r\n' +
    'Python,Booleans,basic,Which is a boolean literal?,true,True,TRUE,"""True""",B,\r\n';
  const v = validateQuestionRows(parseCsv(text), ['Python', 'SQL']);
  assert.ok(v.header.ok);
  assert.equal(v.valid.length, 2);
  assert.equal(v.valid[0].question, 'What does "len" return, exactly?');
  assert.equal(v.valid[1].options.length, 4, 'True / true / TRUE are different options');
  assert.deepEqual(v.errors.map((e) => e.line), [3, 4]);
  assert.ok(!validateQuestionRows([['subject', 'question']], []).header.ok);
});

test('levels: tests count toward the current level only', () => {
  const levels: StudentLevel[] = [
    { id: 'L2', name: 'Level 2', position: 2, requirements: [{ level: 'basic', count: 1, min_score: 0, subject: null }, { level: 'intermediate', count: 1, min_score: 25, subject: null }] },
    { id: 'L1', name: 'Level 1', position: 1, requirements: [{ level: 'basic', count: 2, min_score: 20, subject: 'Python' }] },
  ];
  const t = (level: 'basic' | 'intermediate', subject: string, score: number, day: number): CompletedTest =>
    ({ level, subject, score, submitted_at: `2026-11-${String(day).padStart(2, '0')}T00:00:00Z` });
  assert.equal(computeLevelProgress(levels, [t('basic', 'Python', 30, 1), t('basic', 'SQL', 40, 2)]).current!.requirements[0].done, 1);
  const done = computeLevelProgress(levels, [t('basic', 'Python', 30, 1), t('basic', 'Python', 25, 2), t('intermediate', 'SQL', 30, 3), t('basic', 'SQL', 0, 4)]);
  assert.deepEqual(done.completed.map((c) => c.id), ['L1', 'L2']);
  assert.equal(done.current, null);
  const early = computeLevelProgress(levels, [t('intermediate', 'SQL', 30, 1), t('basic', 'Python', 30, 2), t('basic', 'Python', 25, 3)]);
  assert.equal(early.current!.requirements[1].done, 0);
  assert.ok(cleanRequirements([{ level: 'basic', count: 5, min_score: 0 }], []).ok);
  assert.ok(!cleanRequirements([{ level: 'basic', count: 0 }], []).ok);
});

test('report text: numbers come from the result, AI lines with numbers are dropped (BUG-001)', () => {
  const r = gradeAttempt(Q, { 1: 0, 2: 1, 3: 0 }, { negativeMarking: false, negativeMark: 0 });
  assert.equal(factsSentence(r), 'You scored 3 out of 11 marks (27%), answering 2 of 4 questions correctly, 1 wrong and 1 unanswered.');
  assert.deepEqual(keepAdviceLines(['Strong in Data Types', 'You got 14 out of 50 questions right', 'None', 'Practise loops']), ['Strong in Data Types', 'Practise loops']);
});
