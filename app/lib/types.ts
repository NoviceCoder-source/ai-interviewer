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

export interface AdminInterviewData extends InterviewData {
  profiles: { full_name: string; email: string } | null;
}

export interface Student {
  id: string;
  full_name: string;
  email: string;
  contact: string;
  status: 'pending' | 'approved' | 'rejected';
  updated_at: string;
}