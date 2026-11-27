// Labels one interview answer. This is the only AI step in adaptive difficulty: the AI says WHAT the
// answer was (correct / partial / wrong / don't know / not an answer); code decides the level change.
import { complete } from './client';
import { VERDICTS, type Verdict } from './adaptive';

const SYSTEM = `You grade one answer in a technical interview. Reply with JSON only: {"verdict": "<label>"}.
Labels:
- "correct": the answer is right and covers the key point (minor wording issues are fine).
- "partial": some of it is right but an important part is missing or wrong.
- "wrong": an attempt that is incorrect.
- "dont_know": the candidate says they do not know or makes no attempt (in any language, e.g. "pata nahi").
- "not_an_answer": not an attempt at the question at all — small talk, an off-topic message, or a request
  such as "ask easier questions" or "can you repeat that".
Judge meaning, not language: answers in Hinglish or broken English count the same as English.
Judge only the answer to THIS question. Be fair: do not require more depth than the question asks for.`;

/** Returns the verdict, or "not_an_answer" if the model fails (so the level never moves on an error). */
export async function judgeAnswer(subject: string, level: string, question: string, answer: string): Promise<Verdict> {
  try {
    const raw = await complete(
      SYSTEM,
      [{ role: 'user', content: `Subject: ${subject}\nLevel: ${level}\nQuestion:\n"""\n${question}\n"""\nCandidate's answer:\n"""\n${answer}\n"""` }],
      { temperature: 0, json: true }
    );
    const verdict = JSON.parse(raw)?.verdict;
    return (VERDICTS as readonly string[]).includes(verdict) ? (verdict as Verdict) : 'not_an_answer';
  } catch (err) {
    console.error('[judge] could not judge answer:', err instanceof Error ? err.message : err);
    return 'not_an_answer';
  }
}
