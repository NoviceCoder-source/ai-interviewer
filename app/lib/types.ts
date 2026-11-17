// app/lib/types.ts

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface EvaluationReport {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  /** Set when the candidate ended before answering the minimum number of questions (automatic fail, no AI report). */
  endedEarly?: boolean;
  questionsAnswered?: number;
}

export interface InterviewSummary {
  id: string;
  subject: string;
  difficulty: string;
  created_at: string;
  report: EvaluationReport;
}

export interface InterviewData extends InterviewSummary {
  chat_history: Message[];
}

export interface StudentRef {
  full_name: string;
  email: string;
}

/** Row in the admin reports list (no transcript). */
export interface AdminInterviewSummary extends InterviewSummary {
  profiles: StudentRef | null;
}

/** Full report as seen by an admin. */
export interface AdminInterviewData extends InterviewData {
  profiles: StudentRef | null;
}

export interface Student {
  id: string;
  full_name: string;
  email: string;
  contact: string;
  status: 'pending' | 'approved' | 'rejected';
  updated_at: string;
  credits?: number;
}