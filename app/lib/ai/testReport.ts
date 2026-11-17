// The only LLM use in MCQ tests: turning the (already computed) score breakdown into a short
// written summary. The score itself is never touched by the model.
import { complete } from './client';
import { LEVEL_LABELS, TEST_LEVELS } from '../tests/config';
import type { TestReport, TestResult } from '../tests/types';

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').slice(0, 4) : [];

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function breakdownText(subject: string, level: string, r: TestResult): string {
  const lines = [
    `Subject: ${subject}. Test level: ${level}.`,
    `Score: ${r.score}/${r.maxScore}. Correct ${r.correct}, wrong ${r.wrong}, unanswered ${r.skipped} of ${r.total}.`,
    ...TEST_LEVELS.map((l) => {
      const b = r.byDifficulty[l];
      return `${LEVEL_LABELS[l]} questions: ${b.correct}/${b.total} correct, ${b.wrong} wrong, ${b.skipped} unanswered.`;
    }),
    'By topic:',
    ...r.byTopic.map((t) => `- ${t.topic}: ${t.correct}/${t.total} correct (${pct(t.correct, t.total)}%), ${t.skipped} unanswered.`),
  ];
  return lines.join('\n');
}

/** Template report used when the LLM is unavailable. Deterministic. */
export function rulesReport(r: TestResult): TestReport {
  const topics = r.byTopic.filter((t) => t.total > 0);
  const strong = topics.filter((t) => pct(t.correct, t.total) >= 70).map((t) => `${t.topic}: ${t.correct}/${t.total} correct`);
  const weak = topics.filter((t) => pct(t.correct, t.total) < 50).map((t) => `${t.topic}: revise this topic (${t.correct}/${t.total} correct)`);
  const improvements = [...weak];
  if (r.skipped > 0) improvements.push(`${r.skipped} question(s) were left unanswered; manage time so you attempt every question.`);

  return {
    summary: `You scored ${r.score} out of ${r.maxScore}, with ${r.correct} correct, ${r.wrong} wrong and ${r.skipped} unanswered out of ${r.total} questions.`,
    strengths: strong.length ? strong : ['Keep practising to build strong topics.'],
    improvements: improvements.length ? improvements : ['Try a higher test level to keep improving.'],
    source: 'rules',
  };
}

/** Writes the summary, strengths and improvements. Falls back to the template on any failure. */
export async function writeTestReport(subject: string, level: string, result: TestResult): Promise<TestReport> {
  if (!process.env.GROQ_API_KEY) return rulesReport(result);

  const system = `You are an academic mentor writing feedback on a multiple-choice test.
The score has already been calculated; never change or recalculate it.
Write in clear, simple, professional English only. Never use Hinglish or any other language.
Base everything strictly on the numbers given. Do not invent topics that are not listed.
Return a JSON object with EXACTLY these keys:
{
  "summary": "<2 sentences>",
  "strengths": ["<short point>", "<short point>"],
  "improvements": ["<short, actionable point>", "<short, actionable point>"]
}`;

  try {
    const raw = await complete(system, [{ role: 'user', content: breakdownText(subject, level, result) }], { temperature: 0.2, json: true });
    const parsed = JSON.parse(raw);
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (!summary) throw new Error('empty summary');
    return {
      summary,
      strengths: toStringList(parsed.strengths),
      improvements: toStringList(parsed.improvements),
      source: 'ai',
    };
  } catch (err) {
    console.error('[testReport] falling back to rules report:', err instanceof Error ? err.message : err);
    return rulesReport(result);
  }
}
