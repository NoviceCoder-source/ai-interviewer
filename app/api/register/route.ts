import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { jsonError, serverError } from '../../lib/http';

const USERNAME = /^[a-z0-9_]{3,30}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const fullName = String(body.fullName ?? '').trim();
    const contact = String(body.contact ?? '').trim();
    const username = String(body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!email || !fullName || !username || !password) return jsonError(400, 'All fields are required.');
    if (!EMAIL.test(email)) return jsonError(400, 'Please enter a valid email address.');
    if (!USERNAME.test(username)) {
      return jsonError(400, 'Username must be 3–30 characters: letters, numbers and underscores only.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return jsonError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }

    const { data: existingEmail } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existingEmail) return jsonError(400, 'This email is already registered.');

    const { data: existingUsername } = await supabaseAdmin.from('profiles').select('id').eq('username', username).maybeSingle();
    if (existingUsername) return jsonError(400, 'This username is already taken. Please choose another.');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !authData?.user) {
      console.error('[register] createUser failed:', authError?.message);
      return jsonError(400, 'Unable to create account. Please check your details and try again.');
    }

    // A DB trigger (handle_new_user_sync) creates a bare profiles row as soon as the
    // auth user exists, so upsert rather than insert to avoid a primary-key collision.
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: authData.user.id,
        email,
        full_name: fullName,
        contact: contact || null,
        username,
        role: 'student',
        status: 'pending',
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Starting credits (spec: granted on profile creation). Never block registration on this.
    const { data: settings } = await supabaseAdmin.from('site_settings').select('default_credits').eq('id', 1).maybeSingle();
    const startingCredits = settings?.default_credits ?? 0;
    if (startingCredits > 0) {
      const { error: creditError } = await supabaseAdmin.rpc('adjust_credits', {
        p_user: authData.user.id,
        p_change: startingCredits,
        p_reason: 'Starting credits',
      });
      if (creditError) console.error('[register] could not grant starting credits:', creditError.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('register', err);
  }
}
