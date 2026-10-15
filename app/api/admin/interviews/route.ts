import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { serverError } from '../../../lib/http';

/** All graded interviews, newest first, with the student's name and email. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { data: interviews, error } = await supabaseAdmin
      .from('interviews')
      .select('id, subject, difficulty, created_at, report, user_id')
      .not('report', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const userIds = [...new Set(interviews.map((i) => i.user_id))];
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    return NextResponse.json({
      interviews: interviews.map((i) => ({ ...i, profiles: profileMap[i.user_id] || null })),
    });
  } catch (err) {
    return serverError('admin/interviews', err);
  }
}
