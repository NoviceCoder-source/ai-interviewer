import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Use service role key for server-side auth operations ─────────────────────
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fullName, contact } = body;

    // 1. Basic input validation
    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'Missing mandatory registration entries.' },
        { status: 400 }
      );
    }

    // 2. Check if email already exists in profiles
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered.' },
        { status: 400 }
      );
    }

    // 3. Create auth account with a temporary random password
    // Student will set their real password after approval via setup-account page
    const tempPassword = crypto.randomUUID();
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: tempPassword,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json(
        { error: `Auth Failed: ${authError.message}` },
        { status: 400 }
      );
    }

    if (!authData || !authData.user) {
      return NextResponse.json(
        { error: 'Unable to create auth account.' },
        { status: 400 }
      );
    }

    // 4. Save registration details to profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        contact: contact?.trim() || null,
        role: 'student',
        status: 'pending',
      }]);

    if (profileError) {
      console.error('Profile insert error:', profileError.message);
      // Clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully.'
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Register route error:', message);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}