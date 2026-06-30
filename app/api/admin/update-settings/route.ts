import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // ── Verify the caller is an authenticated admin ──────────────────────
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    // ── Validate input ─────────────────────────────────────────────────
    const body = await req.json();
    const { org_name, logo_url, primary_color, secondary_color, subjects } = body;

    if (!org_name || typeof org_name !== 'string') {
      return NextResponse.json({ error: 'Organisation name is required.' }, { status: 400 });
    }

    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorPattern.test(primary_color) || !hexColorPattern.test(secondary_color)) {
      return NextResponse.json({ error: 'Colors must be valid hex codes (e.g. #4f46e5).' }, { status: 400 });
    }

    if (!Array.isArray(subjects) || subjects.some((s) => typeof s !== 'string')) {
      return NextResponse.json({ error: 'Subjects must be a list of strings.' }, { status: 400 });
    }

    // ── Update ─────────────────────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('site_settings')
      .update({
        org_name: org_name.trim(),
        logo_url: logo_url || null,
        primary_color,
        secondary_color,
        subjects,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('update-settings error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}