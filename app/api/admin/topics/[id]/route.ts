import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { jsonError, serverError } from '../../../../lib/http';

/** DELETE /api/admin/topics/:id — only when the topic has no questions. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { count } = await supabaseAdmin.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', id);
    if (count) return jsonError(409, `This topic still has ${count} question(s). Delete them first.`);

    const { error } = await supabaseAdmin.from('topics').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/topics/delete', err);
  }
}
