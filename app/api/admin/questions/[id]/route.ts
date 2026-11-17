import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { serverError } from '../../../../lib/http';

/**
 * DELETE /api/admin/questions/:id
 * Past tests keep their own copy of each question, so their reports are unaffected.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.from('questions').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/questions/delete', err);
  }
}
