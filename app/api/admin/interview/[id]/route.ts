import { NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '../../../../lib/requireAdmin';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: interview, error } = await supabaseAdmin
    .from('interviews')
    .select('id, subject, difficulty, created_at, report, chat_history, user_id')
    .eq('id', id)
    .single();

  if (error || !interview) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: profile2 } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', interview.user_id).single();

  return NextResponse.json({ interview: { ...interview, profiles: profile2 || null } });
}