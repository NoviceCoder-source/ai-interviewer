import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { enforceRules, finalizeAttempt, getAttempt, toFinishedTest } from '../../../../lib/tests/server';
import type { SubmitReason } from '../../../../lib/tests/types';
import { jsonError, serverError } from '../../../../lib/http';

const CLIENT_REASONS: SubmitReason[] = ['manual', 'left_test', 'time_up'];
/** The browser's countdown may reach zero a moment before the server's deadline. */
const CLOCK_TOLERANCE_MS = 5000;

/** POST /api/tests/:id/submit { reason } — grades the test on the answers saved so far. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const { reason } = await req.json();
    if (!CLIENT_REASONS.includes(reason)) return jsonError(400, 'Invalid reason.');

    const attempt = await getAttempt(id, auth.userId);
    if (!attempt) return jsonError(404, 'Test not found.');

    let current = await enforceRules(attempt);
    if (current.status === 'in_progress') {
      if (reason === 'time_up' && Date.now() < new Date(current.deadline).getTime() - CLOCK_TOLERANCE_MS) {
        return jsonError(400, 'Time is not up yet.');
      }
      current = await finalizeAttempt(current, reason);
    }
    return NextResponse.json({ finished: toFinishedTest(current) });
  } catch (err) {
    return serverError('tests/submit', err);
  }
}
