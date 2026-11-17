import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { jsonError, serverError } from '../../../lib/http';

const STATUSES = ['pending', 'approved', 'rejected'];

/** GET /api/admin/students?status=pending — student profiles for the admin dashboard. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const status = new URL(req.url).searchParams.get('status') ?? 'pending';
  if (!STATUSES.includes(status)) return jsonError(400, 'Invalid status.');

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, contact, status, updated_at, credits')
      .eq('status', status)
      .or('role.is.null,role.eq.student')
      .order('updated_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ students: data });
  } catch (err) {
    return serverError('admin/students', err);
  }
}
