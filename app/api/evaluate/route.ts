import { NextResponse } from 'next/server';
import { requireUser } from '../../lib/auth';
import { getOwnedInterview, saveReport } from '../../lib/interviews';
import { evaluateTranscript } from '../../lib/ai/evaluator';
import { MIN_QUESTIONS_TO_FINISH, countAnsweredQuestions } from '../../lib/questionAnalysis';
import { jsonError, serverError } from '../../lib/http';

/** Grades a finished interview from the stored transcript and saves the report. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { interviewId } = await req.json();
    if (typeof interviewId !== 'string') return jsonError(400, 'Missing interview id.');

    const interview = await getOwnedInterview(interviewId, auth.userId);
    if (!interview) return jsonError(404, 'Interview not found.');
    if (interview.report) return NextResponse.json({ report: interview.report });

    const history = interview.chat_history ?? [];
    if (countAnsweredQuestions(history) < MIN_QUESTIONS_TO_FINISH) {
      return jsonError(400, `Answer at least ${MIN_QUESTIONS_TO_FINISH} questions before ending the interview.`);
    }

    // A trailing unanswered question shouldn't count against the candidate.
    const transcript = history.at(-1)?.role === 'assistant' ? history.slice(0, -1) : history;
    const report = await evaluateTranscript(interview.subject, transcript);
    await saveReport(interview.id, report);

    return NextResponse.json({ report });
  } catch (err) {
    return serverError('evaluate', err);
  }
}
