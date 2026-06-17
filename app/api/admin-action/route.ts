import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, action, studentEmail, studentName } = body;

    if (!studentId || !action || !studentEmail || !studentName) {
      return NextResponse.json({ error: 'Missing mandatory action fields.' }, { status: 400 });
    }

    // 1. Verify that the user executing this request is actually an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized session context.' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access only.' }, { status: 403 });
    }

    // 2. Update the student's status in the database profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: action })
      .eq('id', studentId);

    if (updateError) {
      return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 });
    }

    // 3. Dispatch a clean, link-free transactional notification email based on the action
    let emailSubject = '';
    let emailHtml = '';

    if (action === 'approved') {
      emailSubject = '🎉 Your Bignalytics Account Has Been Approved!';
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; color: #111;">
          <h2>Application Approved!</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Your registration request for Bignalytics has been reviewed and approved by the administration.</p>
          <p>You can now go back to the platform and log in directly using the <strong>username and password</strong> you configured during signup.</p>
          <br />
          <p>Best regards,<br />Bignalytics Administration Team</p>
        </div>
      `;
    } else if (action === 'rejected') {
      emailSubject = 'Update regarding your Bignalytics Registration';
      emailHtml = `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; color: #111;">
          <h2>Registration Update</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Thank you for your interest in Bignalytics. Unfortunately, your account registration request has been declined at this time.</p>
          <p>If you believe this was an error, please reach out to support or attempt registration again with verified credentials.</p>
          <br />
          <p>Best regards,<br />Bignalytics Administration Team</p>
        </div>
      `;
    }

    // 🚀 FIXED: Lazy initialization inside the request lifecycle with a fallback string to satisfy Next.js compilation
    const apiKey = process.env.RESEND_API_KEY || 're_mock_key_for_compilation_passes';
    const resend = new Resend(apiKey);

    // Only attempt the real email dispatch if the key is genuine
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Bignalytics <onboarding@resend.dev>',
        to: studentEmail,
        subject: emailSubject,
        html: emailHtml,
      });
    } else {
      console.warn('RESEND_API_KEY is missing in this environment. Skipping email dispatch.');
    }

    return NextResponse.json({ success: true, message: `Student profile successfully updated to ${action}.` });

  } catch (error: any) {
    console.error('Unexpected admin action route exception:', error);
    return NextResponse.json({ error: 'Internal pipeline execution failure.' }, { status: 500 });
  }
}