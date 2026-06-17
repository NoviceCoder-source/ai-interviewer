import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  const { data: { user } } = await supabase.auth.getUser();

  // ── 1. NOT LOGGED IN GUARD RAIL ───────────────────────────────────────────
  if (!user) {
    if (path.startsWith('/dashboard') || path.startsWith('/admin') || path === '/pending' || path === '/rejected' || path === '/setup-account') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // ── 2. LOGGED IN — FETCH PROFILE WITH MULTI-LAYER FALLBACK ────────────────
  let profileData: any = null;

  // Primary Check: Fetch by Dynamic User ID
  const { data: primaryProfile } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .maybeSingle();

  profileData = primaryProfile;

  // Fallback Check: Fetch by Authenticated Email String
  if (!profileData && user.email) {
    const { data: backupProfile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('email', user.email)
      .maybeSingle();

    profileData = backupProfile;
  }

  // Safety Break if user has an auth account but no custom row inside profiles table
  if (!profileData) {
    if (path !== '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  const status = profileData?.status;
  const role = profileData?.role;

  // ── 3. ADMIN SECURITY ROUTING ─────────────────────────────────────────────
  if (role === 'admin') {
    if (!path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return supabaseResponse;
  }

  // ── 4. STUDENT PENDING SECURITY ROUTING ───────────────────────────────────
  if (status === 'pending') {
    if (path !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
    return supabaseResponse;
  }

  // ── 5. STUDENT REJECTED SECURITY ROUTING ──────────────────────────────────
  if (status === 'rejected') {
    if (path !== '/rejected') {
      return NextResponse.redirect(new URL('/rejected', request.url));
    }
    return supabaseResponse;
  }

  // ── 6. STUDENT APPROVED GATEWAY (SIMPLIFIED & SOLID) ──────────────────────
  // 🚀 THE FIX: We completely removed the setup-account blocker check! 
  // If the status is approved, let them enter the dashboard directly.
  if (status === 'approved') {
    if (path === '/' || path === '/pending' || path === '/rejected' || path === '/setup-account' || path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/confirm|api).*)',
  ],
};