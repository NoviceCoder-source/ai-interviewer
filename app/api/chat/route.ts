import { NextResponse } from 'next/server';
import { requireUser } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { getOwnedInterview, saveChatHistory } from '../../lib/interviews';
import { getSiteSettings } from '../../lib/getSiteSettings';
import { GREETING_PROMPT, RESUME_SUBJECT, nextInterviewerTurn, type AdaptiveTurn } from '../../lib/ai/interviewer';
import { adaptiveStateFrom, applyVerdict, isInterviewLevel } from '../../lib/ai/adaptive';
import { judgeAnswer } from '../../lib/ai/judge';
import { jsonError, serverError } from '../../lib/http';
import type { Message } from '../../lib/types';

const MAX_ANSWER_LENGTH = 5000;

/**
 * Advances an interview by one turn. The stored chat_history is the source of truth:
 * the client sends only its new answer (or nothing, to get the opening question).
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { interviewId, message } = await req.json();
    if (typeof interviewId !== 'string') return jsonError(400, 'Missing interview id.');

    const interview = await getOwnedInterview(interviewId, auth.userId);
    if (!interview) return jsonError(404, 'Interview not found.');
    if (interview.report) return jsonError(409, 'This interview has already been graded.');

    const history: Message[] = interview.chat_history ?? [];
    let conversation: Message[];
    // Phase 3: subject interviews adapt their level; resume interviews do not.
    const startLevel = isInterviewLevel(interview.difficulty) && interview.subject !== RESUME_SUBJECT ? interview.difficulty : null;
    let adaptive: AdaptiveTurn | undefined;

    if (history.length === 0) {
      // Opening turn: the greeting prompt is sent to the model but not stored.
      conversation = [{ role: 'user', content: GREETING_PROMPT }];
      if (startLevel) adaptive = { level: startLevel };
    } else {
      if (typeof message !== 'string' || !message.trim()) return jsonError(400, 'Answer cannot be empty.');
      if (message.length > MAX_ANSWER_LENGTH) return jsonError(400, `Answers are limited to ${MAX_ANSWER_LENGTH} characters.`);

      if (startLevel) {
        // 1. The AI labels the answer. 2. Code applies the 2-in-a-row rule to get the next level.
        const before = adaptiveStateFrom(history, startLevel);
        const lastTurn = [...history].reverse().find((m) => m.role === 'assistant')?.content ?? '';
        const question = lastTurn.split(/\*\*(?:Next |First )?Question:\*\*/i).pop()!.trim();
        const verdict = await judgeAnswer(interview.subject, before.current, question, message);
        const after = applyVerdict(before, verdict);
        const moved = after.changes.length > before.changes.length ? after.changes.at(-1)!.direction : undefined;
        history.push({ role: 'user', content: message, verdict });
        adaptive = { level: after.current, verdict, change: moved };
      } else {
        history.push({ role: 'user', content: message });
      }
      conversation = history;
    }

    const { subjects, org_name } = await getSiteSettings();
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, resume_context')
      .eq('id', auth.userId)
      .single();

    const reply = await nextInterviewerTurn(
      {
        subject: interview.subject,
        difficulty: interview.difficulty,
        resumeContext: interview.subject === RESUME_SUBJECT ? profile?.resume_context : null,
        focusSubjects: subjects,
        orgName: org_name,
        candidateFirstName: profile?.full_name?.trim().split(/\s+/)[0] || null,
      },
      conversation,
      adaptive
    );

    history.push(adaptive ? { role: 'assistant', content: reply, level: adaptive.level as Message['level'] } : { role: 'assistant', content: reply });
    await saveChatHistory(interview.id, history);

    return NextResponse.json({ history });
  } catch (err) {
    return serverError('chat', err);
  }
}
