import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  console.log("--- CALLBACK TRIGGERED ---");
  console.log("Code found:", !!code);
  console.log("Next param:", next);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set(name, value, options); },
          remove(name: string, options: any) { cookieStore.delete(name); },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("Session created:", !!data.session, "Error:", error?.message);

    if (!error && data.session) {
      // Check if this is a password recovery flow
      if (data.session.user.recovery_sent_at) {
        // This came from a password reset email — send to setup-account
        return NextResponse.redirect(`${origin}/setup-account`);
      }
    }
  }

  // Default redirect for everything else
  return NextResponse.redirect(`${origin}/`);
}