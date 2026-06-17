import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, studentEmail, studentName } = body;

    if (!action || !studentEmail || !studentName) {
      return NextResponse.json({ error: 'Missing email communication fields.' }, { status: 400 });
    }

    // Prepare notification content
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
          <br />
          <p>Best regards,<br />Bignalytics Administration Team</p>
        </div>
      `;
    }

    // Lazy load the mailer constructor to satisfy Next.js static compilation phases
    const apiKey = process.env.RESEND_API_KEY || 're_mock_key_for_compilation_passes';
    const resend = new Resend(apiKey);

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Bignalytics <onboarding@resend.dev>',
        to: studentEmail,
        subject: emailSubject,
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, message: 'Notification email task processed successfully.' });

  } catch (error: any) {
    console.error('Email pipeline route exception:', error);
    return NextResponse.json({ error: 'Internal layout processing exception.' }, { status: 500 });
  }
}