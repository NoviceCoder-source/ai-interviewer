import { NextResponse } from 'next/server';
import { requireUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { getSiteSettings } from '../../../lib/getSiteSettings';
import { getTopicsWithCounts } from '../../../lib/tests/bank';
import { closeExpiredAttempts, getTestConfigs } from '../../../lib/tests/server';
import { serverError } from '../../../lib/http';

/** Everything the "New MCQ Test" page needs: subjects, topics with bank sizes, test rules, prices and balance. */
export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    await closeExpiredAttempts(auth.userId);
    const [{ subjects }, topics, configs, costsRes, profileRes, activeRes] = await Promise.all([
      getSiteSettings(),
      getTopicsWithCounts(),
      getTestConfigs(),
      supabaseAdmin.from('credit_costs').select('subject, level, cost'),
      supabaseAdmin.from('profiles').select('credits').eq('id', auth.userId).single(),
      supabaseAdmin.from('test_attempts').select('id').eq('user_id', auth.userId).eq('status', 'in_progress').limit(1).maybeSingle(),
    ]);
    if (costsRes.error) throw costsRes.error;

    return NextResponse.json({
      subjects,
      topics,
      configs,
      costs: costsRes.data ?? [],
      credits: profileRes.data?.credits ?? 0,
      activeAttemptId: activeRes.data?.id ?? null,
    });
  } catch (err) {
    return serverError('tests/setup', err);
  }
}
