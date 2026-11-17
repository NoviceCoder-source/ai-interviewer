// Question-bank CSV parsing and row validation. Pure — used by the upload API.
import { parseDifficulty, type TestLevel } from './config';

/** RFC 4180-style CSV parser: quoted fields, escaped quotes, commas and newlines inside quotes, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully blank lines (e.g. trailing newlines from Excel).
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export const OPTION_COLUMNS = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f'] as const;
export const REQUIRED_COLUMNS = ['subject', 'topic', 'difficulty', 'question', 'option_a', 'option_b', 'correct_answer'] as const;
export const TEMPLATE_HEADER = ['subject', 'topic', 'difficulty', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation'];

export interface ParsedQuestionRow {
  /** 1-based line number in the file (header is line 1). */
  line: number;
  subject: string;
  topic: string;
  difficulty: TestLevel;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

export interface RowError {
  line: number;
  error: string;
}

const headerKey = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, '_');

/**
 * Validates every row. `subjects` is the admin's subject list; a row's subject is matched
 * case-insensitively and stored with the canonical spelling.
 */
export function validateQuestionRows(
  rows: string[][],
  subjects: string[]
): { header: { ok: true } | { ok: false; error: string }; valid: ParsedQuestionRow[]; errors: RowError[] } {
  if (rows.length === 0) return { header: { ok: false, error: 'The file is empty.' }, valid: [], errors: [] };

  const header = rows[0].map(headerKey);
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return {
      header: { ok: false, error: `Missing column(s): ${missing.join(', ')}. Download the template for the expected format.` },
      valid: [],
      errors: [],
    };
  }

  const col = (name: string) => header.indexOf(name);
  const canonicalSubject = new Map(subjects.map((s) => [s.trim().toLowerCase(), s]));
  const valid: ParsedQuestionRow[] = [];
  const errors: RowError[] = [];

  rows.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const get = (name: string) => {
      const i = col(name);
      return i >= 0 ? (cells[i] ?? '').trim() : '';
    };

    const problems: string[] = [];
    const subjectRaw = get('subject');
    const subject = canonicalSubject.get(subjectRaw.toLowerCase());
    if (!subjectRaw) problems.push('subject is empty');
    else if (!subject) problems.push(`subject "${subjectRaw}" is not in the subject list`);

    const topic = get('topic');
    if (!topic) problems.push('topic is empty');
    else if (topic.length > 100) problems.push('topic is longer than 100 characters');

    const difficultyRaw = get('difficulty');
    const difficulty = parseDifficulty(difficultyRaw);
    if (!difficulty) problems.push(difficultyRaw ? `difficulty "${difficultyRaw}" must be basic, intermediate or advanced` : 'difficulty is empty');

    const question = get('question');
    if (!question) problems.push('question is empty');
    else if (question.length > 2000) problems.push('question is longer than 2000 characters');

    // Options must be filled from A onwards with no gaps.
    const rawOptions = OPTION_COLUMNS.map((c) => get(c));
    const lastFilled = rawOptions.map((o) => o !== '').lastIndexOf(true);
    const options = rawOptions.slice(0, lastFilled + 1);
    if (options.length < 2) problems.push('at least option_a and option_b are required');
    else if (options.some((o) => o === '')) problems.push('options must be filled in order with no blank option in between');
    // Case-sensitive on purpose: in code questions `True` and `true` are different answers.
    else if (new Set(options).size !== options.length) problems.push('two options have the same text');

    const answerRaw = get('correct_answer');
    let correctIndex = -1;
    if (!answerRaw) problems.push('correct_answer is empty');
    else if (/^[a-f]$/i.test(answerRaw)) correctIndex = answerRaw.toUpperCase().charCodeAt(0) - 65;
    else correctIndex = options.findIndex((o) => o === answerRaw);
    if (answerRaw && (correctIndex < 0 || correctIndex >= options.length)) {
      problems.push(`correct_answer "${answerRaw}" must be a letter of a filled option (A–${String.fromCharCode(64 + Math.max(options.length, 1))}) or the exact option text`);
    }

    if (problems.length) {
      errors.push({ line, error: problems.join('; ') });
      return;
    }
    valid.push({
      line,
      subject: subject!,
      topic,
      difficulty: difficulty!,
      question,
      options,
      correct_index: correctIndex,
      explanation: get('explanation') || null,
    });
  });

  return { header: { ok: true }, valid, errors };
}

/** Builds one CSV line, quoting where needed. */
export function toCsvLine(values: string[]): string {
  return values.map((v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',');
}
