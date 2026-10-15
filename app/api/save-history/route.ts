import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, chat_history, access_token } = body;

    const headerToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const token = headerToken || access_token;
    if (!token) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

    if (!id || !chat_history) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('interviews')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) return NextResponse.json({ error: 'Interview not found.' }, { status: 404 });
    if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

    const { error } = await supabaseAdmin
      .from('interviews')
      .update({ chat_history })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ save-history error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}