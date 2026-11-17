import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getSiteSettings } from '../../../../lib/getSiteSettings';
import { fetchAll } from '../../../../lib/tests/bank';
import { parseCsv, validateQuestionRows, type ParsedQuestionRow } from '../../../../lib/tests/csv';
import { findNearDuplicate, normalizeQuestion, type IndexedQuestion } from '../../../../lib/tests/similarity';
import { jsonError, serverError } from '../../../../lib/http';

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 3000;

/**
 * POST /api/admin/questions/upload (multipart: file, allowNearDuplicates)
 * 1. Validates every row and rejects incomplete ones (with the line number and reason).
 * 2. Skips exact duplicates of questions already in the bank or earlier in the file.
 * 3. Flags near-duplicates for review; they are only imported when allowNearDuplicates is "true".
 * 4. Creates any topic that doesn't exist yet under its subject.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const form = await req.formData();
    const file = form.get('file');
    const allowNear = form.get('allowNearDuplicates') === 'true';
    if (!(file instanceof File)) return jsonError(400, 'Please choose a CSV file.');
    if (!/\.csv$/i.test(file.name)) return jsonError(400, 'Please upload a .csv file. In Excel use File → Save As → "CSV UTF-8".');
    if (file.size > MAX_BYTES) return jsonError(400, 'The file is larger than 2 MB. Split it into smaller files.');

    const rows = parseCsv(await file.text());
    if (rows.length - 1 > MAX_ROWS) return jsonError(400, `The file has more than ${MAX_ROWS} questions. Split it into smaller files.`);

    const { subjects } = await getSiteSettings();
    const { header, valid, errors } = validateQuestionRows(rows, subjects);
    if (!header.ok) return jsonError(400, header.error);

    // Existing questions in the same subjects, for duplicate checks.
    const fileSubjects = [...new Set(valid.map((r) => r.subject))];
    const existing = fileSubjects.length
      ? await fetchAll<{ id: string; subject: string; normalized: string; question: string }>((from, to) =>
          supabaseAdmin.from('questions').select('id, subject, normalized, question').in('subject', fileSubjects).order('id').range(from, to)
        )
      : [];
    const bySubject = new Map<string, IndexedQuestion[]>();
    const exactKeys = new Set<string>();
    for (const q of existing) {
      bySubject.set(q.subject, [...(bySubject.get(q.subject) ?? []), q]);
      exactKeys.add(`${q.subject}\u0000${q.normalized}`);
    }

    const duplicates: { line: number; question: string }[] = [];
    const nearDuplicates: { line: number; question: string; similarTo: string; similarity: number }[] = [];
    const accepted: (ParsedQuestionRow & { normalized: string })[] = [];

    for (const row of valid) {
      const normalized = normalizeQuestion(row.question);
      const key = `${row.subject}\u0000${normalized}`;
      if (!normalized) {
        errors.push({ line: row.line, error: 'question has no letters or numbers' });
        continue;
      }
      if (exactKeys.has(key)) {
        duplicates.push({ line: row.line, question: row.question });
        continue;
      }
      const pool = bySubject.get(row.subject) ?? [];
      const near = findNearDuplicate(normalized, pool);
      if (near && !allowNear) {
        nearDuplicates.push({ line: row.line, question: row.question, similarTo: near.question, similarity: Math.round(near.score * 100) });
        continue;
      }
      exactKeys.add(key);
      bySubject.set(row.subject, [...pool, { normalized, question: row.question }]);
      accepted.push({ ...row, normalized });
    }

    // Topics: reuse existing ones (case-insensitive), create the missing ones.
    const { data: topicRows, error: topicError } = await supabaseAdmin.from('topics').select('id, subject, name');
    if (topicError) throw topicError;
    const topicKey = (subject: string, name: string) => `${subject}\u0000${name.toLowerCase()}`;
    const topicIds = new Map((topicRows ?? []).map((t) => [topicKey(t.subject, t.name), t.id as string]));
    const missing = [...new Map(accepted.filter((r) => !topicIds.has(topicKey(r.subject, r.topic)))
      .map((r) => [topicKey(r.subject, r.topic), { subject: r.subject, name: r.topic }])).values()];
    if (missing.length) {
      const { data: created, error } = await supabaseAdmin.from('topics').insert(missing).select('id, subject, name');
      if (error) throw error;
      for (const t of created ?? []) topicIds.set(topicKey(t.subject, t.name), t.id);
    }

    const records = accepted.map((r) => ({
      subject: r.subject,
      topic_id: topicIds.get(topicKey(r.subject, r.topic))!,
      difficulty: r.difficulty,
      question: r.question,
      options: r.options,
      correct_index: r.correct_index,
      explanation: r.explanation,
      normalized: r.normalized,
    }));
    for (let i = 0; i < records.length; i += 500) {
      const { error } = await supabaseAdmin.from('questions').insert(records.slice(i, i + 500));
      if (error) throw error;
    }

    return NextResponse.json({
      inserted: records.length,
      createdTopics: missing.map((t) => `${t.subject} → ${t.name}`),
      errors: errors.sort((a, b) => a.line - b.line),
      duplicates,
      nearDuplicates,
    });
  } catch (err) {
    return serverError('admin/questions/upload', err);
  }
}
