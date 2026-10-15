import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { jsonError, serverError } from '../../../lib/http';

const INVALID = 'Invalid email, password or secret code.';

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  try {
    const { email, password, secretCode } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string' || typeof secretCode !== 'string') {
      return jsonError(400, 'All fields are required.');
    }

    // The secret code lives in admin_config, which only the service role can read.
    const { data: config } = await supabaseAdmin.from('admin_config').select('secret_code').single();
    if (!config?.secret_code || !safeEqual(config.secret_code, secretCode.trim())) {
      return jsonError(401, INVALID);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) return jsonError(401, INVALID);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      return jsonError(403, 'You do not have admin access.');
    }

    return NextResponse.json({ redirectTo: '/admin/dashboard' });
  } catch (err) {
    return serverError('auth/admin-login', err);
  }
}
