import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { jsonError, serverError } from '../../../lib/http';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { org_name, logo_url, primary_color, secondary_color, subjects } = await request.json();

    if (!org_name || typeof org_name !== 'string') return jsonError(400, 'Organisation name is required.');
    if (!HEX_COLOR.test(primary_color) || !HEX_COLOR.test(secondary_color)) {
      return jsonError(400, 'Colors must be valid hex codes (e.g. #4f46e5).');
    }
    if (!Array.isArray(subjects) || subjects.length === 0 || subjects.some((s) => typeof s !== 'string' || !s.trim())) {
      return jsonError(400, 'Add at least one subject.');
    }
    if (logo_url != null && (typeof logo_url !== 'string' || !logo_url.startsWith('https://'))) {
      return jsonError(400, 'Logo must be an https URL.');
    }

    const { error } = await supabaseAdmin
      .from('site_settings')
      .update({
        org_name: org_name.trim(),
        logo_url: logo_url || null,
        primary_color,
        secondary_color,
        subjects: subjects.map((s: string) => s.trim()),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/update-settings', err);
  }
}
