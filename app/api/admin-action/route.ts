import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Create a secure, server-side admin client that completely bypasses RLS restrictions safely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '', // 👈 Uses your service role key
  { auth: { persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, action, studentEmail, studentName } = body;

    if (!studentId || !action || !studentEmail || !studentName) {
      return NextResponse.json({ error: 'Missing mandatory action fields.' }, { status: 400 });
    }

    // 1. Update database securely via server client (No RLS blocks possible here)
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ status: action })
      .eq('id', studentId);

    if (dbError) {
      console.error('Admin DB clear exception:', dbError.message);
      return NextResponse.json({ error: `Database mutation aborted: ${dbError.message}` }, { status: 500 });
    }

    // 2. Setup Notification Layout
    let emailSubject = action === 'approved' 
      ? '🎉 Your Bignalytics Account Has Been Approved!' 
      : 'Update regarding your Bignalytics Registration';

    let emailHtml = action === 'approved' ? `
      <div style="font-family: sans-serif; max-width: 500px; padding: 20px; color: #111;">
        <h2>Application Approved!</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your account registration request for Bignalytics has been approved.</p>
        <p>You can now go back to the platform and log in directly using your <strong>username and password</strong>.</p>
      </div>
    ` : `
      <div style="font-family: sans-serif; max-width: 500px; padding: 20px; color: #111;">
        <h2>Registration Update</h2>
        <p>Hi <strong>${studentName}</strong>,</p>
        <p>Your account registration request has been declined at this time.</p>
      </div>
    `;

    // 3. Dispatch Notification via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Bignalytics <onboarding@resend.dev>',
        to: studentEmail, // NOTE: Free Resend keys can only send to YOUR own account email address!
        subject: emailSubject,
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Unified admin runtime exception:', error);
    return NextResponse.json({ error: 'Internal layout processing crash.' }, { status: 500 });
  }
}