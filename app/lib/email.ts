import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Sends a plain notification email via Resend.
 * Returns false (and logs) when email isn't configured or sending fails — callers treat email as best-effort.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!resend || !from) {
    console.warn('sendEmail: RESEND_API_KEY / EMAIL_FROM not set, skipping email to', to);
    return false;
  }
  const { error } = await resend.emails.send({ from, to, subject, text });
  if (error) {
    console.error('sendEmail failed:', error.message);
    return false;
  }
  return true;
}
