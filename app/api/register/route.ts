import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize the privileged admin client using the Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { fullName, contact, email } = await req.json();

    if (!fullName || !contact || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Check if email already exists in profiles
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 });
    }

    // 2. Create a Supabase auth account with a temporary password
    const tempPassword = crypto.randomUUID();
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: email.trim().toLowerCase(),
      password: tempPassword,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: `Auth Failed: ${authError.message}` }, { status: 400 });
    }

    // 3. Save details directly using the admin client (bypasses RLS safely)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          contact: contact.trim(),
          status: 'pending',
          role: 'student',
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('Database Error:', profileError);
      return NextResponse.json({ error: `Database Failed: ${profileError.message}` }, { status: 500 });
    }

    // 4. Force a sign-out on the administration layer so they stay in pending holding
    await supabaseAdmin.auth.signOut();

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('Registration API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}