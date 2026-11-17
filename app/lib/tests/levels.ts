// Student levels: the admin groups tests into levels; progress is computed by code.
import { isTestLevel, type TestLevel } from './config';

export interface LevelRequirement {
  level: TestLevel;
  /** How many tests of this level are needed. */
  count: number;
  /** Minimum score out of 50 for a test to count (0 = any submitted test counts). */
  min_score: number;
  /** Restrict to one subject; null = any subject. */
  subject: string | null;
}

export interface StudentLevel {
  id: string;
  name: string;
  position: number;
  requirements: LevelRequirement[];
}

export interface CompletedTest {
  level: TestLevel;
  subject: string;
  score: number;
  submitted_at: string;
}

export interface RequirementProgress extends LevelRequirement {
  done: number;
}

export interface LevelProgress {
  /** Levels the student has finished, in order. */
  completed: { id: string; name: string }[];
  /** The level being worked on now; null when every level is done (or none exist). */
  current: { id: string; name: string; index: number; requirements: RequirementProgress[] } | null;
  totalLevels: number;
}

/** Validates admin input; returns cleaned requirements or an error message. */
export function cleanRequirements(input: unknown, subjects: string[]): { ok: true; value: LevelRequirement[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: 'Add at least one requirement.' };
  const out: LevelRequirement[] = [];
  for (const r of input) {
    const level = r?.level;
    const count = Number(r?.count);
    const minScore = Number(r?.min_score ?? 0);
    const subject = r?.subject ? String(r.subject) : null;
    if (!isTestLevel(level)) return { ok: false, error: 'Each requirement needs a test level.' };
    if (!Number.isInteger(count) || count < 1 || count > 100) return { ok: false, error: 'Number of tests must be between 1 and 100.' };
    if (!Number.isFinite(minScore) || minScore < 0 || minScore > 50) return { ok: false, error: 'Minimum score must be between 0 and 50.' };
    if (subject && !subjects.includes(subject)) return { ok: false, error: `Unknown subject "${subject}".` };
    out.push({ level, count, min_score: minScore, subject });
  }
  return { ok: true, value: out };
}

const matches = (req: LevelRequirement, t: CompletedTest) =>
  req.level === t.level && (!req.subject || req.subject === t.subject) && t.score >= req.min_score;

/**
 * Walks the student's submitted tests in date order. Each test counts toward the first unmet
 * matching requirement of the CURRENT level only; when every requirement is met the student moves
 * up, and later tests count toward the next level.
 */
export function computeLevelProgress(levels: StudentLevel[], tests: CompletedTest[]): LevelProgress {
  const ordered = [...levels].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const history = [...tests].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
  const completed: { id: string; name: string }[] = [];

  let index = 0;
  const freshCounts = () => (ordered[index]?.requirements ?? []).map(() => 0);
  let counts = freshCounts();
  const isDone = () => ordered[index].requirements.every((r, i) => counts[i] >= r.count);

  /** Marks the current level complete, plus any following levels with no requirements. */
  const skipFinished = () => {
    while (index < ordered.length && isDone()) {
      completed.push({ id: ordered[index].id, name: ordered[index].name });
      index++;
      counts = freshCounts();
    }
  };

  skipFinished();
  for (const test of history) {
    if (index >= ordered.length) break;
    const reqs = ordered[index].requirements;
    const slot = reqs.findIndex((r, i) => counts[i] < r.count && matches(r, test));
    if (slot === -1) continue;
    counts[slot] += 1;
    skipFinished();
  }

  const level = ordered[index];
  return {
    completed,
    current: level
      ? { id: level.id, name: level.name, index, requirements: level.requirements.map((r, i) => ({ ...r, done: counts[i] })) }
      : null,
    totalLevels: ordered.length,
  };
}
