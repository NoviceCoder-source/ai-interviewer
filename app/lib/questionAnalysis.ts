// app/lib/questionAnalysis.ts
import type { EvaluationReport, Message } from './types';
import { normalizeQuestion, similarity } from './tests/similarity';

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/---/g, '─────────────────')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const QUESTION_LABEL = /\*\*(?:Next |First )?Question:\*\*/i;

/**
 * The interviewer's question from one turn — the whole question, INCLUDING any code block.
 * Many questions share the same sentence ("What will be printed by the following code?") and differ
 * only in their code, so the code must be part of the comparison.
 */
export function extractQuestion(content: string): string {
  const parts = content.split(QUESTION_LABEL);
  let question: string;
  if (parts.length > 1) {
    question = parts[parts.length - 1];
  } else {
    // No label: start at the first sentence ending with "?" and keep everything after it (e.g. code).
    const at = content.search(/[^.!?\n]*\?/);
    question = at >= 0 ? content.slice(at) : content;
  }
  const withoutFences = question.replace(/```[a-z0-9]*\n?/gi, '\n');
  return normalizeQuestion(withoutFences);
}

/** Two turns ask the same question when their full text (code included) is at least this similar. */
const SAME_QUESTION_SIMILARITY = 0.85;

export function getUniqueQuestions(assistantMessages: Message[]): Message[] {
  const seen: string[] = [];
  return assistantMessages.filter((msg) => {
    const question = extractQuestion(msg.content);
    if (!question) return false;
    const repeated = seen.some((prev) => similarity(question, prev) >= SAME_QUESTION_SIMILARITY);
    seen.push(question);
    return !repeated;
  });
}

export const MIN_QUESTIONS_TO_FINISH = 5;

/** Unique interviewer questions that the candidate has replied to. */
export function countAnsweredQuestions(history: Message[]): number {
  const unique = new Set(getUniqueQuestions(history.filter((m) => m.role === 'assistant')));
  return history.filter((m, i) => unique.has(m) && history[i + 1]?.role === 'user').length;
}

/** The report recorded when a candidate ends the interview before answering enough questions. */
export function endedEarlyReport(questionsAnswered: number): EvaluationReport {
  return {
    score: 0,
    summary: `Interview ended after ${questionsAnswered} of the required ${MIN_QUESTIONS_TO_FINISH} questions were answered. No evaluation was generated and the interview is marked as failed.`,
    strengths: [],
    improvements: [],
    endedEarly: true,
    questionsAnswered,
  };
}
