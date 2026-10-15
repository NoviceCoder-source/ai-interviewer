import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { getSiteSettings } from '../../../../lib/getSiteSettings';
import { sendEmail } from '../../../../lib/email';
import { jsonError, serverError } from '../../../../lib/http';

const NEW_STATUS: Record<string, 'approved' | 'rejected'> = { approve: 'approved', reject: 'rejected' };

/** POST /api/admin/students/:id { action: 'approve' | 'reject' } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const { action } = await req.json();
    const status = NEW_STATUS[action];
    if (!status) return jsonError(400, 'Invalid action.');

    const { data: student, error } = await supabaseAdmin
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .or('role.is.null,role.eq.student')
      .select('email, full_name')
      .maybeSingle();
    if (error) throw error;
    if (!student) return jsonError(404, 'Student not found.');

    let emailSent = false;
    if (status === 'approved' && student.email) {
      const { org_name } = await getSiteSettings();
      emailSent = await sendEmail(
        student.email,
        `Your ${org_name} account has been approved`,
        `Hi ${student.full_name || 'there'},\n\nYour ${org_name} account has been approved. You can now log in with your username and password.\n\n— ${org_name}`
      );
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (err) {
    return serverError('admin/students/action', err);
  }
}
