import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase'; // Confirmed relative path from app/api/register

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, contact } = body;

    // 1. Basic input assertions
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Missing mandatory registration entries.' }, 
        { status: 400 }
      );
    }

    // 2. Create the user inside Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    // ── TypeScript Fix: Verify authError explicitly first ───────────────────
    if (authError) {
      return NextResponse.json(
        { error: `Auth Failed: ${authError.message}` }, 
        { status: 400 }
      );
    }

    // ── TypeScript Fix: Verify user generation independently ────────────────
    if (!authData || !authData.user) {
      return NextResponse.json(
        { error: 'Unable to register auth profile.' }, 
        { status: 400 }
      );
    }

    // 3. Save details directly using your profile pipeline rules
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          contact: contact || null,
          role: 'student',
          status: 'pending'
        }
      ]);

    if (profileError) {
      console.error('Database insertion error:', profileError.message);
      return NextResponse.json(
        { error: `Profile Creation Failed: ${profileError.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Registration pipeline processed cleanly.' 
    });

  } catch (error: any) {
    console.error('Unexpected system route failure:', error);
    return NextResponse.json(
      { error: 'Internal pipeline structural exception.' }, 
      { status: 500 }
    );
  }
}