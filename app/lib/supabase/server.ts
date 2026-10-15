import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cookie-bound Supabase client for route handlers and server components.
 * Acts as the signed-in user (RLS applies) and can set/clear the session cookies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}
