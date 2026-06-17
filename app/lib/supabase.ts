import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail early if environment variables are not loaded into the context runtime
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('System Configuration Error: Missing Supabase environment variables.');
}

/**
 * Universal Supabase Client
 * Replaces createBrowserClient/createServerClient with the core instance.
 * Safe for both client-side React code and server runtime Next.js API endpoints.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});