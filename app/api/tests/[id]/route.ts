import { NextResponse } from 'next/server';
import { requireUser } from '../../../lib/auth';
import { enforceRules, getAttempt, toFinishedTest, toRunningTest } from '../../../lib/tests/server';
import { jsonError, serverError } from '../../../lib/http';

/**
 * GET /api/tests/:id — the running test (without correct answers), or the finished result.
 * Loading the page counts as returning to the test, so away time is checked here too.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const attempt = await getAttempt(id, auth.userId);
    if (!attempt) return jsonError(404, 'Test not found.');

    const current = await enforceRules(attempt, { treatAsReturn: true });
    if (current.status === 'submitted') return NextResponse.json({ finished: toFinishedTest(current) });
    return NextResponse.json({ running: toRunningTest(current) });
  } catch (err) {
    return serverError('tests/get', err);
  }
}
