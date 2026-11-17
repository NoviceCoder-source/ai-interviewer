import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { closeExpiredAttempts } from '../../../lib/tests/server';
import type { TestSummary } from '../../../lib/tests/types';
import { serverError } from '../../../lib/http';

/** GET /api/admin/tests — every submitted MCQ test, newest first, with the student and anti-cheating summary. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    await closeExpiredAttempts();
    const { data, error } = await supabaseAdmin
      .from('test_attempts')
      .select('id, user_id, subject, topic_name, level, status, created_at, submit_reason, tab_switches, result')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) throw error;

    const userIds = [...new Set((data ?? []).map((t) => t.user_id))];
    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((p) => [p.id, { full_name: p.full_name, email: p.email }]));

    const tests: TestSummary[] = (data ?? []).map(({ result, user_id, ...t }) => ({
      ...t,
      score: result?.score ?? null,
      student: byId.get(user_id) ?? null,
    }));
    return NextResponse.json({ tests });
  } catch (err) {
    return serverError('admin/tests', err);
  }
}
