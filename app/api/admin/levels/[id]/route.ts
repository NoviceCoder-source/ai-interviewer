import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { jsonError, serverError } from '../../../../lib/http';
import { parseLevel } from '../../../../lib/tests/levelsServer';

/** PUT /api/admin/levels/:id { name, position, requirements } */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const parsed = await parseLevel(await req.json());
    if (!parsed.ok) return jsonError(400, parsed.error);
    const { error } = await supabaseAdmin.from('student_levels').update(parsed.value).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/levels/update', err);
  }
}

/** DELETE /api/admin/levels/:id */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.from('student_levels').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/levels/delete', err);
  }
}
