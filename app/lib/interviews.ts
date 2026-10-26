import { supabaseAdmin } from './supabase/admin';
import type { EvaluationReport, Message } from './types';

export interface InterviewRecord {
  id: string;
  user_id: string;
  subject: string;
  difficulty: string;
  status: string;
  chat_history: Message[] | null;
  report: EvaluationReport | null;
}

/** Loads an interview only if it belongs to `userId`. Server-side only. */
export async function getOwnedInterview(id: string, userId: string): Promise<InterviewRecord | null> {
  const { data } = await supabaseAdmin
    .from('interviews')
    .select('id, user_id, subject, difficulty, status, chat_history, report')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  return data as InterviewRecord | null;
}

export async function saveChatHistory(id: string, history: Message[]) {
  const { error } = await supabaseAdmin.from('interviews').update({ chat_history: history }).eq('id', id);
  if (error) throw error;
}

export async function saveReport(id: string, report: EvaluationReport, status: 'completed' | 'failed' = 'completed') {
  const { error } = await supabaseAdmin.from('interviews').update({ report }).eq('id', id);
  if (error) throw error;

  // Status is informational only; never let it block saving the report.
  const { error: statusError } = await supabaseAdmin.from('interviews').update({ status }).eq('id', id);
  if (statusError) console.error('saveReport: could not set status', statusError.message);
}
