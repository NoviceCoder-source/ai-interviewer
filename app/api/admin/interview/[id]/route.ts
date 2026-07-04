import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const { data: interview, error } = await supabaseAdmin
    .from('interviews')
    .select('id, subject, difficulty, created_at, report, chat_history, user_id')
    .eq('id', id)
    .single();

  if (error || !interview) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: profile2 } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', interview.user_id).single();

  return NextResponse.json({ interview: { ...interview, profiles: profile2 || null } });
}