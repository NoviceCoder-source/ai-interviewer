import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role key — can send emails and bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { studentId, studentEmail, action } = await req.json();

    if (!studentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'approve') {
      // Step 1: Update status to approved
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', studentId);

      if (updateError) throw updateError;

      // Step 2: Send password reset email so student can set up their account
      // This email contains a link to /setup-account
      const { error: emailError } = await supabaseAdmin.auth.resetPasswordForEmail(
        studentEmail,
        {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/setup-account`,
        }
      );

      if (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the whole request if email fails
        // Student is approved but may need manual email
        return NextResponse.json({
          success: true,
          warning: 'Student approved but email failed to send. Please notify them manually.'
        });
      }

      return NextResponse.json({ success: true });

    } else if (action === 'reject') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', studentId);

      if (error) throw error;

      return NextResponse.json({ success: true });

    } else if (action === 'revoke') {
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