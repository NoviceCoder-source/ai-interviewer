// The only LLM use in MCQ tests: turning the (already computed) score breakdown into a short
// written summary. The score itself is never touched by the model.
import { complete } from './client';
import { LEVEL_LABELS, TEST_LEVELS } from '../tests/config';
import type { TestReport, TestResult } from '../tests/types';
import { STATES_A_NUMBER, factsSentence, keepAdviceLines, pct, rulesReport } from '../tests/reportText';

export { factsSentence, rulesReport };

const toStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').slice(0, 4) : [];

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

/**
 * Writes the summary, strengths and improvements. The first summary sentence is always the computed
 * facts; the AI only adds advice, in words. Falls back to the template on any failure.
 */
export async function writeTestReport(subject: string, level: string, result: TestResult): Promise<TestReport> {
  if (!process.env.GROQ_API_KEY) return rulesReport(result);

  const system = `You are an academic mentor writing feedback on a multiple-choice test.
The score is already shown to the student; do NOT repeat or restate it.
Write in clear, simple, professional English only. Never use Hinglish or any other language.
NEVER write any number, count, fraction or percentage anywhere in your answer. Refer to topics and levels by name only
(for example "Data Types" or "advanced questions"), and describe performance in words ("strong", "needs practice").
Base everything strictly on the data given. Do not invent topics that are not listed.
If most questions were unanswered, say that attempting more questions is the first priority.
Return a JSON object with EXACTLY these keys:
{
  "advice": "<one sentence of overall advice>",
  "strengths": ["<short point>", "<short point>"],
  "improvements": ["<short, actionable point>", "<short, actionable point>"]
}`;

  try {
    const raw = await complete(system, [{ role: 'user', content: breakdownText(subject, level, result) }], { temperature: 0.2, json: true });
    const parsed = JSON.parse(raw);
    const advice = typeof parsed.advice === 'string' && !STATES_A_NUMBER.test(parsed.advice) ? parsed.advice.trim() : '';
    const fallback = rulesReport(result);
    const strengths = keepAdviceLines(toStringList(parsed.strengths));
    const improvements = keepAdviceLines(toStringList(parsed.improvements));
    return {
      summary: advice ? `${factsSentence(result)} ${advice}` : factsSentence(result),
      strengths: strengths.length ? strengths : fallback.strengths,
      improvements: improvements.length ? improvements : fallback.improvements,
      source: 'ai',
    };
  } catch (err) {
    console.error('[testReport] falling back to rules report:', err instanceof Error ? err.message : err);
    return rulesReport(result);
  }
}
