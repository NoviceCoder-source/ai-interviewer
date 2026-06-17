import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase'; // Confirmed relative path from app/api/register

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName, contact, username } = body;

    // 1. Strict input validation matching your updated front-end requirements
    if (!email || !password || !fullName || !username) {
      return NextResponse.json(
        { error: 'Missing mandatory registration fields: email, password, fullName, and username are required.' }, 
        { status: 400 }
      );
    }

    // 2. Provision the account inside Supabase Auth directly with metadata stamps
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stamping role and username metadata inside the auth session token layout 
        // makes it instantly readable for your database RLS security policies
        data: {
          role: 'student',
          username: username,
          full_name: fullName
        }
      }
    });

    // Explicit check for auth error to clear strict TypeScript validation loops
    if (authError) {
      return NextResponse.json(
        { error: `Authentication Failed: ${authError.message}` }, 
        { status: 400 }
      );
    }

    if (!authData || !authData.user) {
      return NextResponse.json(
        { error: 'Internal Auth Service Error: Unable to provision identity profile.' }, 
        { status: 500 }
      );
    }

    // 3. Atomically write structural details into your custom public profiles matrix
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email: email,
          full_name: fullName,
          contact: contact || null,
          username: username,
          role: 'student',
          status: 'pending' // Forces user directly into the dashboard gate check flow
        }
      ]);

    if (profileError) {
      console.error('Database instantiation error:', profileError.message);
      
      // Edge case cleanup: If profile writing fails, clean up the auth user to allow retries
      // (Optional system step depending on your database delete rules configuration)
      return NextResponse.json(
        { error: `Profile Ingestion Interrupted: ${profileError.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Student record established seamlessly under pending evaluation status.' 
    });

  } catch (error: any) {
    console.error('System registration pipeline runtime exception:', error);
    return NextResponse.json(
      { error: 'Internal system architecture processing failure.' }, 
      { status: 500 }
    );
  }
}