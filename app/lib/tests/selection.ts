// Random question selection by code (never by an LLM).
import { TEST_LEVELS, type QuestionMix, type TestLevel } from './config';

export interface PoolQuestion {
  id: string;
  difficulty: TestLevel;
}

/** Returns a random float in [0, 1). Injected so tests can be deterministic. */
export type Random = () => number;

export function shuffle<T>(items: T[], random: Random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export type PickResult<T> =
  | { ok: true; questions: T[] }
  | { ok: false; shortages: { difficulty: TestLevel; needed: number; available: number }[] };

/**
 * Picks exactly `mix` questions per difficulty without repeats, then shuffles the order
 * so difficulties are mixed through the test.
 */
export function pickQuestions<T extends PoolQuestion>(pool: T[], mix: QuestionMix, random: Random): PickResult<T> {
  const unique = [...new Map(pool.map((q) => [q.id, q])).values()];
  const shortages: { difficulty: TestLevel; needed: number; available: number }[] = [];
  const picked: T[] = [];

  for (const difficulty of TEST_LEVELS) {
    const needed = mix[difficulty];
    const candidates = unique.filter((q) => q.difficulty === difficulty);
    if (candidates.length < needed) {
      shortages.push({ difficulty, needed, available: candidates.length });
      continue;
    }
    picked.push(...shuffle(candidates, random).slice(0, needed));
  }

  if (shortages.length) return { ok: false, shortages };
  return { ok: true, questions: shuffle(picked, random) };
}
