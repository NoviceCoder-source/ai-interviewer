import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/auth';
import { getAttempt, recordProctorEvent } from '../../../../lib/tests/server';
import { jsonError, serverError } from '../../../../lib/http';

const EVENTS = ['leave', 'return', 'check'] as const;

/**
 * POST /api/tests/:id/proctor { event: 'leave' | 'return' | 'check' }
 * The browser reports when the student leaves or comes back; the server counts switches,
 * measures the away time itself and decides whether to auto-submit.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const { event } = await req.json();
    if (!EVENTS.includes(event)) return jsonError(400, 'Invalid event.');

    const attempt = await getAttempt(id, auth.userId);
    if (!attempt) return jsonError(404, 'Test not found.');

    const after = await recordProctorEvent(attempt, event);
    return NextResponse.json({
      status: after.status,
      tabSwitches: after.tab_switches,
      submitReason: after.submit_reason,
    });
  } catch (err) {
    return serverError('tests/proctor', err);
  }
}
