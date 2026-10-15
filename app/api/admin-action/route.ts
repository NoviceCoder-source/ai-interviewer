import { NextResponse } from 'next/server';
import { requireAdmin, supabaseAdmin } from '../../lib/requireAdmin';

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { studentId, studentEmail, action } = await req.json();

    if (!studentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'approve') {
      // Update status to approved
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', studentId);

      if (updateError) throw updateError;

      // Send simple notification email — no links, just inform them
      const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: studentEmail,
        options: {
          data: { type: 'approval_notification' }
        }
      });

      // Don't fail if email has issues — status is already updated
      if (emailError) {
        console.error('Notification email error:', emailError.message);
      }

      return NextResponse.json({ success: true });

    } else if (action === 'reject' || action === 'revoke') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', studentId);

      if (error) throw error;

      return NextResponse.json({ success: true });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Admin action error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}