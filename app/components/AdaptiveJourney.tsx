import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import type { AdaptiveReport } from '../lib/types';

const LEVEL_STYLE: Record<string, string> = {
  Beginner: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Intermediate: 'bg-blue-50 text-blue-700 border-blue-200',
  Advanced: 'bg-purple-50 text-purple-700 border-purple-200',
};

function LevelPill({ level }: { level: string }) {
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${LEVEL_STYLE[level] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{level}</span>;
}

/** Phase 3: how the interview's difficulty moved (2 right in a row → harder, 2 wrong → easier). */
export default function AdaptiveJourney({ adaptive, className = '' }: { adaptive: AdaptiveReport; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#e0eaf5] bg-white p-5 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <TrendingUp size={17} className="text-[#53739b]" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8293aa]">Level journey</h3>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        {([['Started at', adaptive.start], ['Highest reached', adaptive.highest], ['Finished at', adaptive.final]] as const).map(([label, level]) => (
          <div key={label} className="rounded-xl bg-[#f5f9fe] px-3 py-3">
            <p className="text-[11px] font-semibold text-[#7790ad]">{label}</p>
            <div className="mt-1.5"><LevelPill level={level} /></div>
          </div>
        ))}
      </div>

      {adaptive.changes.length > 0 ? (
        <ul className="mt-3 space-y-1.5 text-sm text-[#2c4a72]">
          {adaptive.changes.map((c, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              {c.direction === 'up'
                ? <ArrowUpRight size={15} className="text-emerald-600" />
                : <ArrowDownRight size={15} className="text-amber-600" />}
              <span>After answer {c.afterAnswer}:</span> <LevelPill level={c.from} /> <span>→</span> <LevelPill level={c.to} />
              <span className="text-xs text-[#7790ad]">({c.direction === 'up' ? '2 correct in a row' : '2 wrong in a row'})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#607a9f]">The level stayed at {adaptive.start} for the whole interview.</p>
      )}
      <p className="mt-3 text-[11px] text-[#9aadc2]">Questions get harder after 2 correct answers in a row and easier after 2 wrong answers in a row.</p>
    </section>
  );
}
