import { NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '../../../lib/requireAdmin';

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // ── Validate input ───────────────────────────────────────────────────
    const body = await request.json();
    const { org_name, logo_url, primary_color, secondary_color, subjects } = body;

    if (!org_name || typeof org_name !== 'string')
      return NextResponse.json({ error: 'Organisation name is required.' }, { status: 400 });

    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorPattern.test(primary_color) || !hexColorPattern.test(secondary_color))
      return NextResponse.json({ error: 'Colors must be valid hex codes (e.g. #4f46e5).' }, { status: 400 });

    if (!Array.isArray(subjects) || subjects.some((s) => typeof s !== 'string'))
      return NextResponse.json({ error: 'Subjects must be a list of strings.' }, { status: 400 });

    // ── Update ───────────────────────────────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('site_settings')
      .update({ org_name: org_name.trim(), logo_url: logo_url || null, primary_color, secondary_color, subjects, updated_at: new Date().toISOString() })
      .eq('id', 1);

    if (updateError) throw updateError;
    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('update-settings error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}