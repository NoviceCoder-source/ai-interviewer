import { NextResponse } from 'next/server';

// The Supabase recovery email puts the token in the URL hash (#access_token=...)
// Hash fragments are NEVER sent to the server — they only exist in the browser.
// So this server route does nothing except redirect to a client-side page
// that can read window.location.hash and exchange the token for a session.

export async function GET(request: Request) {
  const { origin, search } = new URL(request.url);

  // Pass along any query params (e.g. ?code=xxx for OTP flow)
  // The hash fragment is automatically preserved by the browser on redirect
  return NextResponse.redirect(`${origin}/auth/confirm${search}`);
}