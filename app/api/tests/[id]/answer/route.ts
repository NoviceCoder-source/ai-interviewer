import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getAttempt } from '../../../../lib/tests/server';
import { jsonError, serverError } from '../../../../lib/http';

/** POST /api/tests/:id/answer { questionId, option: number | null } — saves or clears one answer. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const { questionId, option } = await req.json();
    if (typeof questionId !== 'string') return jsonError(400, 'Missing question.');

    const attempt = await getAttempt(id, auth.userId);
    if (!attempt) return jsonError(404, 'Test not found.');
    if (attempt.status !== 'in_progress') return jsonError(409, 'This test has already been submitted.');

    const question = attempt.questions.find((q) => q.id === questionId);
    if (!question) return jsonError(400, 'That question is not part of this test.');
    if (option !== null && !(Number.isInteger(option) && option >= 0 && option < question.options.length)) {
      return jsonError(400, 'Invalid option.');
    }

    const { data: saved, error } = await supabaseAdmin.rpc('set_test_answer', {
      p_attempt: id,
      p_user: auth.userId,
      p_question: questionId,
      p_option: option,
      p_now: new Date().toISOString(),
    });
    if (error) throw error;
    if (!saved) return jsonError(409, 'Time is up. This test is closed.');

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('tests/answer', err);
  }
}
