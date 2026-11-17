'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ClipboardList, Clock, Coins, Eye, Play, ShieldAlert } from 'lucide-react';
import { api } from '../../../lib/api';
import {
  AWAY_LIMIT_SECONDS, LEVEL_LABELS, MARKS, MAX_TAB_SWITCHES, SUBMIT_REASON_LABELS, TEST_LEVELS, mixCount, mixOf,
  type TestConfig, type TestLevel,
} from '../../../lib/tests/config';
import type { TestSummary } from '../../../lib/tests/types';
import Notice, { type NoticeMessage } from '../../../components/Notice';
import LoadingState from '../../../components/LoadingState';
import { secondaryBg, secondaryText, secondaryTint } from '../../../lib/theme';

interface TopicRow {
  id: string;
  subject: string;
  name: string;
  counts: Record<TestLevel, number>;
}

interface Setup {
  subjects: string[];
  topics: TopicRow[];
  configs: Record<TestLevel, TestConfig>;
  costs: { subject: string; level: TestLevel; cost: number }[];
  credits: number;
  activeAttemptId: string | null;
}

const LEVEL_ICONS: Record<TestLevel, string> = { basic: '🌱', intermediate: '⚡', advanced: '🔥' };

export default function TestsPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [history, setHistory] = useState<TestSummary[]>([]);
  const [subject, setSubject] = useState('');
  const [topicId, setTopicId] = useState('');
  const [level, setLevel] = useState<TestLevel | ''>('');
  const [confirming, setConfirming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  useEffect(() => {
    Promise.all([api.get<Setup>('/api/tests/setup'), api.get<{ tests: TestSummary[] }>('/api/tests')])
      .then(([s, h]) => {
        setSetup(s);
        setHistory(h.tests);
      })
      .catch((err) => setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Could not load tests.' }));
  }, []);

  const subjectTopics = useMemo(() => setup?.topics.filter((t) => t.subject === subject) ?? [], [setup, subject]);

  /** Questions available for the chosen subject/topic, per difficulty. */
  const available = useMemo(() => {
    const rows = topicId ? subjectTopics.filter((t) => t.id === topicId) : subjectTopics;
    return rows.reduce((acc, t) => {
      for (const l of TEST_LEVELS) acc[l] += t.counts[l];
      return acc;
    }, { basic: 0, intermediate: 0, advanced: 0 } as Record<TestLevel, number>);
  }, [subjectTopics, topicId]);

  if (!setup) {
    return notice ? <div className="p-8"><Notice notice={notice} /></div> : <LoadingState label="Loading tests..." />;
  }

  const costFor = (l: TestLevel) => setup.costs.find((c) => c.subject === subject && c.level === l)?.cost ?? setup.configs[l].credit_cost;
  const isAvailable = (l: TestLevel) => {
    const mix = mixOf(setup.configs[l]);
    return !!subject && TEST_LEVELS.every((d) => available[d] >= mix[d]);
  };
  const chosen = level ? setup.configs[level] : null;
  const cost = level ? costFor(level) : 0;
  const enoughCredits = setup.credits >= cost;

  const start = async () => {
    if (!level) return;
    setStarting(true);
    setNotice(null);
    try {
      const { id } = await api.post<{ id: string }>('/api/tests', { subject, topicId: topicId || null, level });
      router.push(`/dashboard/test/${id}`);
    } catch (err) {
      setConfirming(false);
      setStarting(false);
      setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Could not start the test.' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-8">
      <div className="mx-auto max-w-[1050px] space-y-4">
        {setup.activeAttemptId && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            <Clock size={16} /> You have a test in progress. The timer keeps running while you are away.
            <Link href={`/dashboard/test/${setup.activeAttemptId}`} className="ml-auto rounded-xl bg-amber-500 px-4 py-1.5 font-semibold text-white">Resume test</Link>
          </div>
        )}

        <section className="rounded-3xl border border-[#e2ebf5] bg-white p-5 shadow-[0_18px_55px_rgba(30,75,125,0.08)] sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={secondaryTint(12)}>
                <ClipboardList size={20} style={secondaryText} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">New MCQ Test</h1>
                <p className="text-xs text-[#7790ad] sm:text-sm">Questions come from your institute&apos;s question bank. Every test is out of 50 marks.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[#f1f6fc] px-4 py-2 text-sm font-semibold text-ink">
              <Coins size={16} style={secondaryText} /> {setup.credits} credits
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SelectField label="Subject" value={subject} onChange={(v) => { setSubject(v); setTopicId(''); setLevel(''); }}>
              <option value="">Choose a subject…</option>
              {setup.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </SelectField>
            <SelectField label="Topic" value={topicId} onChange={(v) => { setTopicId(v); setLevel(''); }} disabled={!subject}>
              <option value="">All topics (full subject test)</option>
              {subjectTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectField>
          </div>

          <p className="mt-5 mb-2 text-sm font-semibold text-ink-soft">Test level</p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {TEST_LEVELS.map((l) => {
              const c = setup.configs[l];
              const ok = isAvailable(l);
              const selected = level === l;
              return (
                <button
                  key={l}
                  onClick={() => ok && setLevel(l)}
                  disabled={!ok}
                  style={selected ? { borderColor: 'var(--color-secondary)', ...secondaryTint(6) } : undefined}
                  className={`rounded-xl border p-3.5 text-left transition ${selected ? 'shadow-sm' : 'border-[#dce6f0] bg-white hover:border-[#a9ccec]'} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{LEVEL_ICONS[l]}</span>
                    <span className="text-sm font-semibold text-ink-soft">{LEVEL_LABELS[l]}</span>
                    {subject && <span className="ml-auto text-xs font-bold" style={secondaryText}>{costFor(l)} credits</span>}
                  </div>
                  <p className="mt-2 text-xs text-[#7790ad]">
                    {mixCount(mixOf(c))} questions · {c.duration_minutes} min · {c.negative_marking ? `negative marking (${c.negative_mark}×)` : 'no negative marking'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#9aadc2]">
                    {c.basic_count} basic · {c.intermediate_count} intermediate · {c.advanced_count} advanced
                  </p>
                  {subject && !ok && <p className="mt-1 text-[11px] font-semibold text-amber-600">Not enough questions in the bank yet</p>}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <Notice notice={notice} className="mb-3" />
            {chosen && !enoughCredits && (
              <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                This test costs {cost} credits and you have {setup.credits}. Please contact your admin for a top-up.
              </p>
            )}
            <button
              onClick={() => setConfirming(true)}
              disabled={!chosen || !enoughCredits || !!setup.activeAttemptId}
              style={secondaryBg}
              className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:opacity-90 disabled:opacity-50"
            >
              <Play size={16} fill="currentColor" /> Start Test{chosen ? ` · ${cost} credits` : ''}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-[#e2ebf5] bg-white p-5 sm:px-6">
          <h2 className="text-base font-bold text-ink">Your tests</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-[#7790ad]">No tests yet. Your results will appear here.</p>
          ) : (
            <div className="mt-3 divide-y divide-[#edf2f7]">
              {history.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{t.subject} · {LEVEL_LABELS[t.level]}</p>
                    <p className="text-xs text-[#7790ad]">
                      {t.topic_name ?? 'All topics'} · {new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      {t.submit_reason && t.submit_reason !== 'manual' && <span className="ml-1 text-amber-600">· {SUBMIT_REASON_LABELS[t.submit_reason]}</span>}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {t.status === 'submitted' ? (
                      <>
                        <span className="text-lg font-bold tabular-nums" style={secondaryText}>{t.score}<span className="text-xs text-[#9aadc2]">/50</span></span>
                        <Link href={`/dashboard/tests/${t.id}`} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: 'var(--color-secondary)', ...secondaryText }}>
                          <Eye size={14} /> Report
                        </Link>
                      </>
                    ) : (
                      <Link href={`/dashboard/test/${t.id}`} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">Resume</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {confirming && chosen && level && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1b33]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-ink">Before you start</h2>
            <p className="mt-1 text-sm text-[#607a9f]">
              {subject} · {subjectTopics.find((t) => t.id === topicId)?.name ?? 'All topics'} · {LEVEL_LABELS[level]} — {mixCount(mixOf(chosen))} questions, 50 marks, {chosen.duration_minutes} minutes.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-[#2c4a72]">
              <li className="flex gap-2"><Coins size={16} className="mt-0.5 shrink-0" style={secondaryText} /> {cost} credits are deducted as soon as the test starts. No refund for leaving early.</li>
              <li className="flex gap-2"><Clock size={16} className="mt-0.5 shrink-0" style={secondaryText} /> The timer runs on the server and the test is submitted automatically when time is up.</li>
              <li className="flex gap-2"><ClipboardList size={16} className="mt-0.5 shrink-0" style={secondaryText} /> Marks: basic {MARKS.basic}, intermediate {MARKS.intermediate}, advanced {MARKS.advanced}. {chosen.negative_marking ? `Wrong answers lose ${chosen.negative_mark}× the question's marks.` : 'No negative marking.'} Unanswered questions score 0. You can move back, forward and skip freely.</li>
              <li className="flex gap-2"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500" /> Copy, paste and right-click are disabled. Every tab or window switch is recorded: the {MAX_TAB_SWITCHES}th switch, or staying away more than {AWAY_LIMIT_SECONDS} seconds, submits the test.</li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirming(false)} disabled={starting} className="rounded-xl px-5 py-2 text-sm font-semibold text-[#53739b] hover:bg-[#f1f6fc]">Cancel</button>
              <button onClick={start} disabled={starting} style={secondaryBg} className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {starting ? 'Starting…' : `Start · ${cost} credits`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, disabled, children }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-ink-soft">
      {label}
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-[42px] w-full appearance-none rounded-xl border border-[#d7e5f2] bg-white px-4 pr-12 text-sm font-normal text-ink-soft outline-none disabled:bg-[#f5f9fe] disabled:text-[#9aadc2]"
        >
          {children}
        </select>
        <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6f89a8]" />
      </div>
    </label>
  );
}
