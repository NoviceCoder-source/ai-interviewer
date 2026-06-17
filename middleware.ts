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

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!user) {
    if (path.startsWith('/dashboard') || path.startsWith('/admin/dashboard')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // ── Logged in — fetch profile ──────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single();

  const status = profile?.status;
  const role = profile?.role;

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
    if (path.startsWith('/dashboard') || path === '/') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: rejected ──────────────────────────────────────────────────────
  if (status === 'rejected') {
    if (path.startsWith('/dashboard') || path === '/') {
      return NextResponse.redirect(new URL('/rejected', request.url));
    }
    return supabaseResponse;
  }

  // ── Student: approved ──────────────────────────────────────────────────────
  if (status === 'approved') {
    if (path === '/' || path === '/pending' || path === '/rejected') {
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
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api).*)',
  ],
};