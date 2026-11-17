import { NextResponse } from 'next/server';
import { requireUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { computeLevelProgress, type CompletedTest, type StudentLevel } from '../../../lib/tests/levels';
import { serverError } from '../../../lib/http';

/** GET /api/me/summary — credit balance, recent credit history and level progress for the dashboard. */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const [profileRes, ledgerRes, levelsRes, testsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('credits').eq('id', auth.userId).single(),
      supabaseAdmin.from('credit_ledger').select('change, balance_after, reason, created_at').eq('user_id', auth.userId)
        .order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('student_levels').select('id, name, position, requirements'),
      supabaseAdmin.from('test_attempts').select('level, subject, result, submitted_at').eq('user_id', auth.userId)
        .eq('status', 'submitted').order('submitted_at').limit(2000),
    ]);
    for (const r of [ledgerRes, levelsRes, testsRes]) if (r.error) throw r.error;

    const completedTests: CompletedTest[] = (testsRes.data ?? []).map((t) => ({
      level: t.level,
      subject: t.subject,
      score: Number(t.result?.score ?? 0),
      submitted_at: t.submitted_at,
    }));

    return NextResponse.json({
      credits: profileRes.data?.credits ?? 0,
      ledger: ledgerRes.data ?? [],
      levels: computeLevelProgress((levelsRes.data ?? []) as StudentLevel[], completedTests),
      testsTaken: completedTests.length,
    });
  } catch (err) {
    return serverError('me/summary', err);
  }
}
