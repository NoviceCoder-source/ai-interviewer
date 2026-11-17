import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { parseLevel } from '../../../lib/tests/levelsServer';
import { jsonError, serverError } from '../../../lib/http';

/** GET /api/admin/levels — student levels in order. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { data, error } = await supabaseAdmin.from('student_levels').select('id, name, position, requirements').order('position').order('name');
    if (error) throw error;
    return NextResponse.json({ levels: data ?? [] });
  } catch (err) {
    return serverError('admin/levels', err);
  }
}

/** POST /api/admin/levels { name, position, requirements } */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const parsed = await parseLevel(await req.json());
    if (!parsed.ok) return jsonError(400, parsed.error);
    const { data, error } = await supabaseAdmin.from('student_levels').insert(parsed.value).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (err) {
    return serverError('admin/levels/create', err);
  }
}
