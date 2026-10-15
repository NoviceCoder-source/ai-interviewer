import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { jsonError } from '../../../../lib/http';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { data: interview } = await supabaseAdmin
    .from('interviews')
    .select('id, subject, difficulty, created_at, report, chat_history, user_id')
    .eq('id', id)
    .maybeSingle();
  if (!interview) return jsonError(404, 'Not found.');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email')
    .eq('id', interview.user_id)
    .maybeSingle();

  return NextResponse.json({ interview: { ...interview, profiles: profile || null } });
}
