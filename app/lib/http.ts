import { NextResponse } from 'next/server';

export const jsonError = (status: number, error: string) =>
  NextResponse.json({ error }, { status });

/** Logs the real error server-side and returns a generic 500 to the client. */
export function serverError(context: string, err: unknown) {
  console.error(`[${context}]`, err instanceof Error ? err.message : err);
  return jsonError(500, 'Something went wrong. Please try again.');
}
