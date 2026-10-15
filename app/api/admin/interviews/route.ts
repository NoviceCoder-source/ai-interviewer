import { NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '../../../lib/requireAdmin';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: interviews, error } = await supabaseAdmin
    .from('interviews')
    .select('id, subject, difficulty, created_at, report, user_id')
    .not('report', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = [...new Set(interviews.map(i => i.user_id))];
  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, email').in('id', userIds);
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
  const result = interviews.map(i => ({ ...i, profiles: profileMap[i.user_id] || null }));

  return NextResponse.json({ interviews: result });
}