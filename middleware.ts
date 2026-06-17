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

  // ── Allow setup-account through if it has a recovery token ────────────────
  const token = request.nextUrl.searchParams.get('token');
  const type = request.nextUrl.searchParams.get('type');
  if (path === '/setup-account' && token && type === 'recovery') {
    return supabaseResponse;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    if (path.startsWith('/dashboard') || path.startsWith('/admin') || path === '/pending' || path === '/rejected' || path === '/setup-account') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // ── Logged in — fetch profile with Robust Mismatch Fallback ──────────────────
  let profileData: any = null;

  // 1. Primary Check: Scan by Auth User ID
  const { data: primaryProfile } = await supabase
    .from('profiles')
    .select('status, role, username, email')
    .eq('id', user.id)
    .maybeSingle(); // Prevent code from crashing if 0 rows are returned

  profileData = primaryProfile;

  // 🚀 FALLBACK GATEWAY RECOVERY: 
  // Agar ID mismatch ki wajah se user row nahi mili, toh logged-in email string se scan karo!
  if (!profileData && user.email) {
    const { data: backupProfile } = await supabase
      .from('profiles')
      .select('status, role, username, email')
      .eq('email', user.email)
      .maybeSingle();

    profileData = backupProfile;
  }

  // Absolute safety fallback if the account exists in auth but has no row in profiles
  if (!profileData) {
    // If no row exists at all, don't loop — let them hit home or handle gracefully
    if (path !== '/') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  const status = profileData?.status;
  const role = profileData?.role;
  const username = profileData?.username;

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (role === 'admin') {
    if (!path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: pending ───────────────────────────────────────────────────────
  if (status === 'pending') {
    if (path !== '/pending') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: rejected ──────────────────────────────────────────────────────
  if (status === 'rejected') {
    if (path !== '/rejected') {
      return NextResponse.redirect(new URL('/rejected', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: approved, no username yet → must complete setup ──────────────
  if (status === 'approved' && !username) {
    if (path !== '/setup-account') {
      return NextResponse.redirect(new URL('/setup-account', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: approved and fully set up ────────────────────────────────────
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