import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getSiteSettings } from '../../../lib/getSiteSettings';
import { jsonError, serverError } from '../../../lib/http';

const INVALID = 'Invalid username or password.';

/** Escapes LIKE wildcards so usernames containing "_" or "%" match literally. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return jsonError(400, 'Username and password are required.');
    }

    // Username → email lookup happens server-side so profiles never need to be publicly readable.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, status, role')
      .ilike('username', escapeLike(username.trim()))
      .maybeSingle();
    if (!profile?.email) return jsonError(401, INVALID);

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: profile.email, password });
    if (signInError) return jsonError(401, INVALID);

    // Only reveal account status once the password has been proven.
    if (profile.status === 'pending' || profile.status === 'rejected') {
      await supabase.auth.signOut();
      const message = profile.status === 'pending'
        ? 'Your account is still pending approval.'
        : `Your account has been rejected. Please contact ${(await getSiteSettings()).org_name}.`;
      return jsonError(403, message);
    }

    return NextResponse.json({ redirectTo: profile.role === 'admin' ? '/admin/dashboard' : '/dashboard' });
  } catch (err) {
    return serverError('auth/login', err);
  }
}
