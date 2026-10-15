import { NextResponse } from 'next/server';
import { requireUser } from '../../lib/auth';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { getSiteSettings } from '../../lib/getSiteSettings';
import { RESUME_SUBJECT } from '../../lib/ai/interviewer';
import { jsonError, serverError } from '../../lib/http';

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

/** Creates a new interview session for the signed-in student. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const { mode, subject, difficulty } = await req.json();

    let row: { subject: string; difficulty: string };
    if (mode === 'resume') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('resume_context')
        .eq('id', auth.userId)
        .single();
      if (!profile?.resume_context) return jsonError(400, 'Please upload your resume first.');
      row = { subject: RESUME_SUBJECT, difficulty: 'Personalized' };
    } else {
      const { subjects } = await getSiteSettings();
      if (!subjects.includes(subject)) return jsonError(400, 'Please choose a valid subject.');
      if (!DIFFICULTIES.includes(difficulty)) return jsonError(400, 'Please choose a valid difficulty.');
      row = { subject, difficulty };
    }

    const { data, error } = await supabaseAdmin
      .from('interviews')
      .insert({ ...row, user_id: auth.userId, status: 'in_progress' })
      .select('id')
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch (err) {
    return serverError('interviews/create', err);
  }
}
