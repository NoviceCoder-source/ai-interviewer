import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { isTestLevel } from '../../../lib/tests/config';
import { serverError } from '../../../lib/http';

const PAGE_SIZE = 50;

/** GET /api/admin/questions?subject=&topicId=&difficulty=&q=&page= — one page of the bank. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const params = new URL(req.url).searchParams;
    const page = Math.max(0, Number(params.get('page')) || 0);
    const subject = params.get('subject');
    const topicId = params.get('topicId');
    const difficulty = params.get('difficulty');
    const search = params.get('q')?.trim();

    let query = supabaseAdmin
      .from('questions')
      .select('id, subject, topic_id, difficulty, question, options, correct_index, explanation, created_at, topics(name)', { count: 'exact' });
    if (subject) query = query.eq('subject', subject);
    if (topicId) query = query.eq('topic_id', topicId);
    if (difficulty && isTestLevel(difficulty)) query = query.eq('difficulty', difficulty);
    if (search) query = query.ilike('question', `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .order('id')
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw error;

    const questions = (data ?? []).map(({ topics, ...q }) => {
      const rel = topics as unknown as { name: string } | { name: string }[] | null;
      return { ...q, topic: (Array.isArray(rel) ? rel[0]?.name : rel?.name) ?? '' };
    });
    return NextResponse.json({ questions, total: count ?? 0, pageSize: PAGE_SIZE });
  } catch (err) {
    return serverError('admin/questions', err);
  }
}
