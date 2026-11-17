import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { jsonError, serverError } from '../../../lib/http';

/** POST /api/admin/credits { userId, amount, note } — top up (positive) or remove (negative) credits. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { userId, amount, note } = await req.json();
    const change = Number(amount);
    if (typeof userId !== 'string') return jsonError(400, 'Missing student.');
    if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 100000) {
      return jsonError(400, 'Enter a whole number of credits (use a minus sign to remove credits).');
    }

    const { data: student } = await supabaseAdmin.from('profiles').select('id').eq('id', userId).or('role.is.null,role.eq.student').maybeSingle();
    if (!student) return jsonError(404, 'Student not found.');

    const reason = (typeof note === 'string' && note.trim() ? note.trim().slice(0, 120) : null) ?? (change > 0 ? 'Refill by admin' : 'Removed by admin');
    const { data: balance, error } = await supabaseAdmin.rpc('adjust_credits', {
      p_user: userId,
      p_change: change,
      p_reason: reason,
      p_by: auth.userId,
    });
    if (error) {
      if (error.message.includes('INSUFFICIENT_CREDITS')) return jsonError(400, 'The student does not have that many credits to remove.');
      throw error;
    }
    return NextResponse.json({ balance });
  } catch (err) {
    return serverError('admin/credits', err);
  }
}
