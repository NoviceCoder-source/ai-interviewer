'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Coins } from 'lucide-react';
import { api } from '../../lib/api';
import { LEVEL_LABELS, TOTAL_MARKS } from '../../lib/tests/config';
import type { LevelProgress } from '../../lib/tests/levels';
import { secondaryBg, secondaryText, secondaryTint } from '../../lib/theme';

interface Summary {
  credits: number;
  levels: LevelProgress;
  testsTaken: number;
}

/** Credit balance and current level progress at the top of the student dashboard. */
export default function ProgressStrip() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.get<Summary>('/api/me/summary').then(setSummary).catch(() => setSummary(null));
  }, []);

  if (!summary) return null;
  const { levels } = summary;

  return (
    <section className="mb-4 grid shrink-0 gap-4 lg:grid-cols-[220px_1fr]">
      <Link href="/dashboard/tests" className="flex items-center gap-3 rounded-2xl border border-[#e0e8f2] bg-white px-5 py-4 transition hover:shadow-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={secondaryTint(12)}>
          <Coins size={20} style={secondaryText} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7790ad]">Credits</p>
          <p className="text-2xl font-bold tabular-nums text-[#10254a]">{summary.credits}</p>
        </div>
      </Link>

      <div className="rounded-2xl border border-[#e0e8f2] bg-white px-5 py-4">
        {levels.totalLevels === 0 ? (
          <div className="flex items-center gap-3 text-sm text-[#607a9f]">
            <Award size={18} style={secondaryText} /> {summary.testsTaken} MCQ test{summary.testsTaken === 1 ? '' : 's'} completed.
          </div>
        ) : levels.current === null ? (
          <div className="flex items-center gap-3 text-sm font-semibold text-[#10254a]">
            <Award size={20} className="text-amber-500" /> All {levels.totalLevels} levels complete. Well done!
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Award size={18} style={secondaryText} />
              <p className="text-sm font-bold text-[#10254a]">{levels.current.name}</p>
              <span className="text-xs text-[#7790ad]">· level {levels.current.index + 1} of {levels.totalLevels}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {levels.current.requirements.map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-[#587292]">
                    <span>
                      {LEVEL_LABELS[r.level]} tests{r.subject ? ` · ${r.subject}` : ''}{r.min_score > 0 ? ` · ≥${r.min_score}/${TOTAL_MARKS}` : ''}
                    </span>
                    <span className="font-semibold tabular-nums">{Math.min(r.done, r.count)}/{r.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#e4edf6]">
                    <div className="h-1.5 rounded-full" style={{ ...secondaryBg, width: `${Math.min(100, (r.done / r.count) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
