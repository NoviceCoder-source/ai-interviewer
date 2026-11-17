// Duplicate detection for the question bank. Deterministic text comparison, no AI.
//
// Questions often contain code, where symbols carry the meaning (`a[1:]` vs `a[:1]`), so symbols are
// kept. Only letter case and whitespace are ignored.

/** Lower-case and collapse whitespace. Two questions with the same key are exact duplicates. */
export function normalizeQuestion(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Character trigrams, padded so very short texts still produce some. */
function trigrams(normalized: string): Set<string> {
  const s = `  ${normalized} `;
  const out = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) out.add(s.slice(i, i + 3));
  return out;
}

/** Jaccard similarity of character trigrams, 0..1. */
export function similarity(aNormalized: string, bNormalized: string): number {
  if (aNormalized === bNormalized) return 1;
  const a = trigrams(aNormalized);
  const b = trigrams(bNormalized);
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** At or above this similarity a question is flagged as a near-duplicate for the admin to review. */
export const NEAR_DUPLICATE_THRESHOLD = 0.6;

export interface IndexedQuestion {
  id?: string;
  normalized: string;
  question: string;
}

/** The most similar existing question, if it crosses the near-duplicate threshold. */
export function findNearDuplicate(normalized: string, existing: IndexedQuestion[]): (IndexedQuestion & { score: number }) | null {
  let best: (IndexedQuestion & { score: number }) | null = null;
  for (const q of existing) {
    const score = similarity(normalized, q.normalized);
    if (score >= NEAR_DUPLICATE_THRESHOLD && (!best || score > best.score)) best = { ...q, score };
  }
  return best;
}
