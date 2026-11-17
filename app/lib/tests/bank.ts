// Server-side question bank helpers (service role).
import { supabaseAdmin } from '../supabase/admin';
import { TEST_LEVELS, type TestLevel } from './config';

export interface Topic {
  id: string;
  subject: string;
  name: string;
}

export type LevelCounts = Record<TestLevel, number>;

export interface TopicWithCounts extends Topic {
  counts: LevelCounts;
}

const PAGE = 1000;

/** Reads every row of a query, page by page (PostgREST caps a single response at 1000 rows). */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export const emptyCounts = (): LevelCounts => Object.fromEntries(TEST_LEVELS.map((l) => [l, 0])) as LevelCounts;

/** All topics with how many questions each has per difficulty. */
export async function getTopicsWithCounts(): Promise<TopicWithCounts[]> {
  const { data: topics, error } = await supabaseAdmin.from('topics').select('id, subject, name').order('subject').order('name');
  if (error) throw error;

  const rows = await fetchAll<{ topic_id: string; difficulty: TestLevel }>((from, to) =>
    supabaseAdmin.from('questions').select('topic_id, difficulty').order('id').range(from, to)
  );
  const counts = new Map<string, LevelCounts>();
  for (const r of rows) {
    const c = counts.get(r.topic_id) ?? emptyCounts();
    c[r.difficulty] += 1;
    counts.set(r.topic_id, c);
  }
  return (topics ?? []).map((t) => ({ ...t, counts: counts.get(t.id) ?? emptyCounts() }));
}
