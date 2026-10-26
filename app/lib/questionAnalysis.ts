// app/lib/questionAnalysis.ts
import type { EvaluationReport, Message } from './types';

const STOP_WORDS = new Set([
  'what', 'is', 'are', 'the', 'a', 'an', 'in', 'of', 'to', 'do', 'does', 'how',
  'why', 'when', 'where', 'which', 'can', 'you', 'your', 'it', 'its', 'this',
  'that', 'and', 'or', 'for', 'with', 'about', 'between', 'explain', 'describe',
  'define', 'tell', 'me', 'difference', 'use', 'used', 'give', 'example', 'write',
  'simple', 'basic', 'python', 'sql', 'data', 'machine', 'learning', 'analytics',
]);

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

export function extractQuestion(content: string): string {
  // Every interviewer turn carries the same "**Question:**" / "**Next Question:**" label; it must not count as shared keywords.
  const text = content.replace(/\*\*(?:Next )?Question:\*\*/gi, ' ');
  const sentences = text.split(/(?<=[.?!])\s+/);
  const questionSentence = sentences.find((s) => s.trim().endsWith('?')) || sentences[sentences.length - 1];
  return questionSentence.toLowerCase().trim();
}

export function getKeywords(text: string): Set<string> {
  const words = text
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}

export function getUniqueQuestions(assistantMessages: Message[]): Message[] {
  return assistantMessages.filter((msg, index) => {
    if (index === 0) return true;
    const currentKeywords = getKeywords(extractQuestion(msg.content));
    if (currentKeywords.size === 0) return true;
    const isDuplicate = assistantMessages.slice(0, index).some((prevMsg) => {
      const prevKeywords = getKeywords(extractQuestion(prevMsg.content));
      if (prevKeywords.size === 0) return false;
      const overlap = [...currentKeywords].filter((w) => prevKeywords.has(w)).length;
      return overlap / Math.max(currentKeywords.size, prevKeywords.size) >= 0.75;
    });
    return !isDuplicate;
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
