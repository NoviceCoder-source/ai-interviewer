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

  // 1. Agar user logged in nahi hai aur dashboard/admin access kar raha hai -> Send to login
  if (!user) {
    if (path.startsWith('/dashboard') || path.startsWith('/admin') || path === '/pending' || path === '/rejected') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return supabaseResponse;
  }

  // 2. Fetch Profile strictly by ID (No fallbacks needed anymore!)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  // 3. Loop Breaker Check: Agar user landing page '/' par hai par already approved hai -> Send to dashboard
  if (path === '/' && profile?.status === 'approved' && profile?.role === 'student') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (path === '/' && profile?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // 4. Secure Authorization Gateway Redirections
  if (path.startsWith('/dashboard') || path.startsWith('/admin')) {
    if (!profile) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    if (profile.role === 'student') {
      if (profile.status === 'pending' && path !== '/pending') {
        return NextResponse.redirect(new URL('/pending', request.url));
      }
      if (profile.status === 'rejected' && path !== '/rejected') {
        return NextResponse.redirect(new URL('/rejected', request.url));
      }
    }

    if (profile.role === 'admin' && !path.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/confirm|api).*)',
  ],
};