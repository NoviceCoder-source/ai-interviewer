// app/lib/types.ts

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** Assistant turns in adaptive interviews: the level of the question asked in this turn. */
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  /** Candidate turns in adaptive interviews: how the AI judged this answer. */
  verdict?: 'correct' | 'partial' | 'wrong' | 'dont_know' | 'not_an_answer';
}

/** Level journey of an adaptive interview (Phase 3). */
export interface AdaptiveReport {
  start: 'Beginner' | 'Intermediate' | 'Advanced';
  final: 'Beginner' | 'Intermediate' | 'Advanced';
  highest: 'Beginner' | 'Intermediate' | 'Advanced';
  changes: { afterAnswer: number; from: string; to: string; direction: 'up' | 'down' }[];
  questionLevels: string[];
}

export interface EvaluationReport {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  /** Set when the candidate ended before answering the minimum number of questions (automatic fail, no AI report). */
  endedEarly?: boolean;
  questionsAnswered?: number;
  /** Present for adaptive subject interviews. */
  adaptive?: AdaptiveReport | null;
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