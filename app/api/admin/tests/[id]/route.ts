import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getAttempt, toFinishedTest } from '../../../../lib/tests/server';
import { jsonError, serverError } from '../../../../lib/http';

/** GET /api/admin/tests/:id — full report incl. answers and the anti-cheating log. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const attempt = await getAttempt(id);
    if (!attempt || attempt.status !== 'submitted') return jsonError(404, 'Test not found.');
    const { data: student } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', attempt.user_id).maybeSingle();
    return NextResponse.json({ test: toFinishedTest(attempt, student ?? null) });
  } catch (err) {
    return serverError('admin/tests/get', err);
  }
}
