import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses the service role key so the save works even if the user's
// auth session cookie has already been cleared during page unload.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { id, chat_history } = await req.json();
    if (!id || !chat_history) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

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