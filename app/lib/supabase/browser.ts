import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('System Configuration Error: Missing Supabase environment variables.');
}

/**
 * Cookie-based Supabase client (via @supabase/ssr).
 * Required so that middleware.ts (server-side) can read the same session
 * that the browser sets — a localStorage-based session would be invisible
 * to server-side route protection.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);