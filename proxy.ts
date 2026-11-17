import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const STUDENT_PATHS = ['/dashboard'];
const ADMIN_PATHS = [
  '/admin/dashboard', '/admin/reports', '/admin/settings',
  '/admin/question-bank', '/admin/test-settings', '/admin/levels', '/admin/test-reports',
];
const AUTH_ONLY_PATHS = ['/pending', '/rejected'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const isStudentPath = STUDENT_PATHS.some((p) => pathname.startsWith(p));
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));

  // Not logged in at all → bounce to login for any protected path
  if ((isStudentPath || isAdminPath || isAuthOnlyPath) && !user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Admin-only pages: verify role
  if (isAdminPath && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Student dashboard: students only, and only once approved
  if (isStudentPath && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    if (profile?.status === 'pending') return NextResponse.redirect(new URL('/pending', request.url));
    if (profile?.status === 'rejected') return NextResponse.redirect(new URL('/rejected', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/dashboard/:path*',
    '/admin/reports/:path*',
    '/admin/settings/:path*',
    '/admin/question-bank/:path*',
    '/admin/test-settings/:path*',
    '/admin/levels/:path*',
    '/admin/test-reports/:path*',
    '/pending',
    '/rejected',
  ],
};