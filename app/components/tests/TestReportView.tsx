'use client';
import { AlertTriangle, CheckCircle2, CircleSlash, Download, ShieldAlert, XCircle } from 'lucide-react';
import { LEVEL_LABELS, MAX_TAB_SWITCHES, SUBMIT_REASON_LABELS, TEST_LEVELS } from '../../lib/tests/config';
import type { FinishedTest } from '../../lib/tests/types';
import StrengthsImprovements from '../StrengthsImprovements';

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** Full MCQ test report: score, breakdowns, written feedback, anti-cheating log and question review. */
export default function TestReportView({ test, onDownload }: { test: FinishedTest; onDownload: () => void }) {
  const r = test.result;
  const autoSubmitted = test.submit_reason && test.submit_reason !== 'manual';

  return (
    <div className="space-y-4">
      {/* Score */}
      <section className="rounded-3xl border border-[#e2ebf5] bg-white p-6 shadow-[0_18px_55px_rgba(30,75,125,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#7790ad]">
              {LEVEL_LABELS[test.level]} test · {new Date(test.started_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink">
              {test.subject} <span className="text-base font-semibold text-[#7790ad]">· {test.topic_name ?? 'All topics'}</span>
            </h1>
            {test.student && <p className="mt-1 text-sm text-[#607a9f]">{test.student.full_name} · {test.student.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-4xl font-black tabular-nums" style={{ color: 'var(--color-secondary)' }}>
              {r.score}<span className="text-xl text-[#9aadc2]"> / {r.maxScore}</span>
            </p>
            <p className="text-xs font-semibold text-[#7790ad]">{pct(r.score, r.maxScore)}%</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<CheckCircle2 size={16} className="text-emerald-600" />} label="Correct" value={r.correct} />
          <Stat icon={<XCircle size={16} className="text-red-500" />} label="Wrong" value={r.wrong} />
          <Stat icon={<CircleSlash size={16} className="text-gray-400" />} label="Unanswered" value={r.skipped} />
          <Stat
            icon={<span className="text-xs font-bold text-amber-600">−</span>}
            label={test.negative_marking ? `Negative (×${test.negative_mark})` : 'No negative marking'}
            value={test.negative_marking ? r.negativeMarks : '—'}
          />
        </div>

        {autoSubmitted && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            <AlertTriangle size={16} /> {SUBMIT_REASON_LABELS[test.submit_reason!]}
          </p>
        )}

        <button
          onClick={onDownload}
          className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--color-secondary)' }}
        >
          <Download size={15} /> Download PDF
        </button>
      </section>

      {/* Breakdown */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Table
          title="Marks by level"
          head={['Level', 'Correct', 'Wrong', 'Skipped', 'Marks']}
          rows={TEST_LEVELS.filter((l) => r.byDifficulty[l].total > 0).map((l) => {
            const b = r.byDifficulty[l];
            return [LEVEL_LABELS[l], `${b.correct}/${b.total}`, b.wrong, b.skipped, `${b.marks}/${b.maxMarks}`];
          })}
        />
        <Table
          title="By topic"
          head={['Topic', 'Correct', 'Accuracy', 'Marks']}
          rows={r.byTopic.map((t) => [t.topic, `${t.correct}/${t.total}`, `${pct(t.correct, t.total)}%`, `${t.marks}/${t.maxMarks}`])}
        />
      </section>

      {/* Written feedback */}
      {test.report ? (
        <>
          <section className="rounded-3xl border border-[#e2ebf5] bg-white p-6">
            <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-[#7790ad]">Summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#2c4a72]">{test.report.summary}</p>
          </section>
          <StrengthsImprovements strengths={test.report.strengths} improvements={test.report.improvements} />
        </>
      ) : (
        <p className="text-sm text-[#7790ad]">The written summary is still being prepared. Refresh in a moment.</p>
      )}

      {/* Anti-cheating */}
      <section className="rounded-3xl border border-[#e2ebf5] bg-white p-6">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-[#7790ad]">
          <ShieldAlert size={14} /> Anti-cheating
        </h2>
        <p className="mt-2 text-sm text-[#2c4a72]">
          Tab / window switches: <b>{test.tab_switches}</b> of {MAX_TAB_SWITCHES} allowed
        </p>
        {test.proctor_log.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-[#607a9f]">
            {test.proctor_log.map((e, i) => (
              <li key={i}>
                <span className="font-mono">{new Date(e.at).toLocaleTimeString()}</span> —{' '}
                {e.type === 'leave' && `Left the test window (${e.detail ?? ''})`}
                {e.type === 'return' && `Came back after ${e.awaySeconds ?? '?'} seconds`}
                {e.type === 'auto_submit' && `Test auto-submitted: ${SUBMIT_REASON_LABELS[e.detail ?? ''] ?? e.detail}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Question review */}
      <section className="rounded-3xl border border-[#e2ebf5] bg-white p-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-[#7790ad]">Question review</h2>
        <ol className="mt-4 space-y-4">
          {test.questions.map((q, i) => {
            const answer = test.answers[q.id];
            const status = answer === undefined ? 'skipped' : answer === q.correct_index ? 'correct' : 'wrong';
            return (
              <li key={q.id} className="rounded-2xl border border-[#edf2f7] p-4">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#7790ad]">
                  <span className="text-ink">Q{i + 1}</span>
                  <span>{LEVEL_LABELS[q.difficulty]}</span>·<span>{q.topic}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 ${
                    status === 'correct' ? 'bg-emerald-50 text-emerald-700' : status === 'wrong' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {status === 'correct' ? 'Correct' : status === 'wrong' ? 'Wrong' : 'Unanswered'}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-ink">{q.question}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {q.options.map((o, j) => (
                    <li
                      key={j}
                      className={`rounded-lg px-3 py-1.5 ${
                        j === q.correct_index ? 'bg-emerald-50 font-semibold text-emerald-800' : j === answer ? 'bg-red-50 text-red-700' : 'text-[#4a6385]'
                      }`}
                    >
                      {String.fromCharCode(65 + j)}. {o}
                      {j === answer && <span className="ml-2 text-[11px] font-bold">(your answer)</span>}
                    </li>
                  ))}
                </ul>
                {q.explanation && <p className="mt-2 text-xs text-[#607a9f]">Explanation: {q.explanation}</p>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#f5f9fe] px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7790ad]">{icon}{label}</div>
      <p className="mt-1 text-xl font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-[#e2ebf5] bg-white p-6">
      <h2 className="text-[11px] font-bold uppercase tracking-[2px] text-[#7790ad]">{title}</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-[11px] text-[#9aadc2]">
          <tr>{head.map((h, i) => <th key={h} className={`py-1.5 ${i ? 'text-right' : ''}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#edf2f7] text-[#2c4a72]">
          {rows.map((row, i) => (
            <tr key={i}>{row.map((c, j) => <td key={j} className={`py-1.5 ${j ? 'text-right tabular-nums' : 'font-medium'}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
