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
  // Supabase sends: /setup-account?token=xxx&type=recovery
  // Middleware runs server-side before the page loads, so the token is in
  // the query params and we must let it through unauthenticated.
  const token = request.nextUrl.searchParams.get('token');
  const type = request.nextUrl.searchParams.get('type');
  if (path === '/setup-account' && token && type === 'recovery') {
    return supabaseResponse; // let it through — page will verify the token
  }

  const { data: { user } } = await supabase.auth.getUser();

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    if (path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // ── Logged in — fetch profile ──────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, role, username')
    .eq('id', user.id)
    .single();

  const status = profile?.status;
  const role = profile?.role;
  const username = profile?.username;

  // ── Admin ──────────────────────────────────────────────────────────────────
  if (role === 'admin') {
    if (path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (path === '/' || path === '/pending' || path === '/rejected') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: pending ───────────────────────────────────────────────────────
  if (status === 'pending') {
    if (path.startsWith('/dashboard') || path === '/' || path === '/rejected') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: rejected ──────────────────────────────────────────────────────
  if (status === 'rejected') {
    if (path.startsWith('/dashboard') || path === '/' || path === '/pending') {
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
    if (path === '/' || path === '/pending' || path === '/rejected' || path === '/setup-account') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (path.startsWith('/admin')) {
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