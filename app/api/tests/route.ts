import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireUser } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { getSiteSettings } from '../../lib/getSiteSettings';
import { fetchAll } from '../../lib/tests/bank';
import { LEVEL_LABELS, isTestLevel, mixOf, type TestLevel } from '../../lib/tests/config';
import { pickQuestions } from '../../lib/tests/selection';
import { closeExpiredAttempts, getCreditCost, getTestConfigs } from '../../lib/tests/server';
import type { AttemptQuestion, TestSummary } from '../../lib/tests/types';
import { jsonError, serverError } from '../../lib/http';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cryptoRandom = () => randomInt(0, 2 ** 32) / 2 ** 32;

/** GET /api/tests — the signed-in student's tests, newest first. */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    await closeExpiredAttempts(auth.userId);
    const { data, error } = await supabaseAdmin
      .from('test_attempts')
      .select('id, subject, topic_name, level, status, created_at, submit_reason, tab_switches, result')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const tests: TestSummary[] = (data ?? []).map(({ result, ...t }) => ({ ...t, score: result?.score ?? null }));
    return NextResponse.json({ tests });
  } catch (err) {
    return serverError('tests/list', err);
  }
}

/**
 * POST /api/tests { subject, topicId | null, level }
 * Picks the questions at random (by code), charges the credits and opens the attempt in one
 * database transaction.
 */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const subject = String(body.subject ?? '');
    const topicId = body.topicId ? String(body.topicId) : null;
    const level = body.level as TestLevel;

    const { subjects } = await getSiteSettings();
    if (!subjects.includes(subject)) return jsonError(400, 'Please choose a valid subject.');
    if (!isTestLevel(level)) return jsonError(400, 'Please choose a valid test level.');
    if (topicId && !UUID.test(topicId)) return jsonError(400, 'Please choose a valid topic.');

    let topicName: string | null = null;
    if (topicId) {
      const { data: topic } = await supabaseAdmin.from('topics').select('name, subject').eq('id', topicId).maybeSingle();
      if (!topic || topic.subject !== subject) return jsonError(400, 'Please choose a valid topic.');
      topicName = topic.name;
    }

    await closeExpiredAttempts(auth.userId);

    const config = (await getTestConfigs())[level];
    const cost = await getCreditCost(subject, level, config);

    // 1. Pick question ids at random from the bank.
    const pool = await fetchAll<{ id: string; difficulty: TestLevel }>((from, to) => {
      let q = supabaseAdmin.from('questions').select('id, difficulty').eq('subject', subject);
      if (topicId) q = q.eq('topic_id', topicId);
      return q.order('id').range(from, to);
    });
    const pick = pickQuestions(pool, mixOf(config), cryptoRandom);
    if (!pick.ok) {
      const detail = pick.shortages.map((s) => `${LEVEL_LABELS[s.difficulty]}: ${s.available} of ${s.needed}`).join(', ');
      return jsonError(409, `This test isn't available yet: the question bank doesn't have enough questions (${detail}). Please choose another topic or level.`);
    }

    // 2. Snapshot the full questions onto the attempt.
    const ids = pick.questions.map((q) => q.id);
    const { data: rows, error: rowsError } = await supabaseAdmin
      .from('questions')
      .select('id, difficulty, question, options, correct_index, explanation, topics(name)')
      .in('id', ids);
    if (rowsError) throw rowsError;
    const byId = new Map((rows ?? []).map((r) => [r.id, r]));
    const snapshot: AttemptQuestion[] = ids.map((id) => {
      const r = byId.get(id)!;
      const topicRel = r.topics as unknown as { name: string } | { name: string }[] | null;
      const topic = Array.isArray(topicRel) ? topicRel[0]?.name : topicRel?.name;
      return {
        id: r.id,
        topic: topic ?? topicName ?? subject,
        difficulty: r.difficulty,
        question: r.question,
        options: r.options,
        correct_index: r.correct_index,
        explanation: r.explanation,
      };
    });

    // 3. Charge credits + create the attempt atomically.
    const startedAt = new Date();
    const deadline = new Date(startedAt.getTime() + config.duration_minutes * 60_000);
    const { data: attemptId, error } = await supabaseAdmin.rpc('start_test_attempt', {
      p_user: auth.userId,
      p_cost: cost,
      p_subject: subject,
      p_topic_id: topicId,
      p_topic_name: topicName,
      p_level: level,
      p_questions: snapshot,
      p_started_at: startedAt.toISOString(),
      p_deadline: deadline.toISOString(),
      p_negative_marking: config.negative_marking,
      p_negative_mark: config.negative_mark,
    });

    if (error) {
      if (error.message.includes('INSUFFICIENT_CREDITS')) {
        return jsonError(402, `Not enough credits. This test costs ${cost} credits. Please contact your admin for a top-up.`);
      }
      if (error.message.includes('ACTIVE_ATTEMPT')) {
        return jsonError(409, 'You already have a test in progress. Finish it before starting a new one.');
      }
      throw error;
    }

    return NextResponse.json({ id: attemptId });
  } catch (err) {
    return serverError('tests/start', err);
  }
}
