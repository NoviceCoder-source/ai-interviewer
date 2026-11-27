import { complete } from './client';
import type { EvaluationReport, Message } from '../types';

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Grades a transcript. Throws if the model returns nothing usable. */
export async function evaluateTranscript(subject: string, history: Message[], adaptive = false): Promise<EvaluationReport> {
  const adaptiveNote = adaptive
    ? `\nThis was an ADAPTIVE interview: each interviewer turn has a "level" (the difficulty of that question) and each candidate turn has a "verdict".
Questions got harder after two correct answers in a row and easier after two wrong ones. Give more credit for correct answers at higher levels,
and mention in the summary how far the candidate progressed (the level reached).`
    : '';
  const system = `You are a technical recruiter. Analyze the transcript for a ${subject} role.
Write the summary, strengths and improvements in clear, professional English only — never Hinglish or any other language.${adaptiveNote}
You MUST return a JSON object with EXACTLY these keys:
{
  "score": <number 0-100>,
  "summary": "<2 sentence string>",
  "strengths": ["string", "string", "string"],
  "improvements": ["string", "string", "string"]
}`;

  const raw = await complete(
    system,
    [{ role: 'user', content: `Transcript: ${JSON.stringify(history)}` }],
    { temperature: 0.2, json: true }
  );
  if (!raw) throw new Error('Evaluator returned empty content.');

  const parsed = JSON.parse(raw);
  const score = Number(parsed.score);
  if (!Number.isFinite(score)) throw new Error('Evaluator returned no score.');

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'No summary generated.',
    strengths: toStringList(parsed.strengths),
    improvements: toStringList(parsed.improvements),
  };
}
