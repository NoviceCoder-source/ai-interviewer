import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { getSiteSettings } from '../../../lib/getSiteSettings';
import { getTopicsWithCounts } from '../../../lib/tests/bank';
import { jsonError, serverError } from '../../../lib/http';

/** GET /api/admin/topics — every topic with its question counts per difficulty. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ topics: await getTopicsWithCounts() });
  } catch (err) {
    return serverError('admin/topics', err);
  }
}

/** POST /api/admin/topics { subject, name } */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const subject = String(body.subject ?? '').trim();
    const name = String(body.name ?? '').trim();
    const { subjects } = await getSiteSettings();
    if (!subjects.includes(subject)) return jsonError(400, 'Choose a valid subject.');
    if (!name || name.length > 100) return jsonError(400, 'Topic name must be 1–100 characters.');

    const { data, error } = await supabaseAdmin.from('topics').insert({ subject, name }).select('id, subject, name').single();
    if (error) {
      if (error.code === '23505') return jsonError(409, `"${name}" already exists under ${subject}.`);
      throw error;
    }
    return NextResponse.json({ topic: data });
  } catch (err) {
    return serverError('admin/topics/create', err);
  }
}
