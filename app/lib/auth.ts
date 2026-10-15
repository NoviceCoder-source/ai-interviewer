import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

const fail = (status: number, error: string): AuthResult => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

/** Verifies the session cookie with Supabase and returns the caller's user id. */
export async function requireUser(): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, 'Not authenticated.');
  return { ok: true, userId: user.id };
}

/** Like requireUser, but also requires profiles.role = 'admin'. */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .single();

  if (profile?.role !== 'admin') return fail(403, 'Admin access required.');
  return auth;
}
