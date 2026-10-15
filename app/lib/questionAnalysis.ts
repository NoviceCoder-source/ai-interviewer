// app/lib/questionAnalysis.ts
import type { Message } from './types';

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
  const sentences = content.split(/(?<=[.?!])\s+/);
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