'use client';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, LogOut, Send, ShieldAlert, SkipForward } from 'lucide-react';
import { api } from '../../../lib/api';
import { AWAY_LIMIT_SECONDS, LEVEL_LABELS, MARKS, MAX_TAB_SWITCHES } from '../../../lib/tests/config';
import type { RunningTest, SubmitReason } from '../../../lib/tests/types';

type ProctorResponse = { status: 'in_progress' | 'submitted'; tabSwitches: number; submitReason: SubmitReason | null };
type Dialog = null | 'submit' | 'exit' | { warning: number };

const BLOCKED_KEYS = new Set(['c', 'x', 'v', 'a', 'p', 's', 'u']);
const formatTime = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`;
};

function loadVisited(id: string): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(`test-visited-${id}`) || '[]'));
  } catch {
    return new Set();
  }
}

export default function TestRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [test, setTest] = useState<RunningTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [tabSwitches, setTabSwitches] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [dialog, setDialog] = useState<Dialog>(null);
  const [awayFor, setAwayFor] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [clockOffset, setClockOffset] = useState(0);
  const finished = useRef(false);
  const away = useRef<{ since: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const proctorQueue = useRef<Promise<unknown>>(Promise.resolve());

  const goToResult = useCallback(() => {
    finished.current = true;
    router.replace(`/dashboard/tests/${id}`);
  }, [id, router]);

  // ---- Load ---------------------------------------------------------------
  useEffect(() => {
    api.get<{ running?: RunningTest; finished?: unknown }>(`/api/tests/${id}`)
      .then((d) => {
        if (!d.running) return goToResult();
        setClockOffset(new Date(d.running.serverNow).getTime() - Date.now());
        setTest(d.running);
        setAnswers(d.running.answers);
        setTabSwitches(d.running.tab_switches);
        const seen = loadVisited(id);
        if (d.running.questions[0]) seen.add(d.running.questions[0].id);
        setVisited(seen);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the test.'));
  }, [id, goToResult]);

  const questions = useMemo(() => test?.questions ?? [], [test]);
  const current = questions[index];

  /** Records that a question has been shown (unanswered + visited = "skipped" in the navigator). */
  const markVisited = (questionId: string) =>
    setVisited((v) => {
      if (v.has(questionId)) return v;
      const next = new Set(v).add(questionId);
      try { sessionStorage.setItem(`test-visited-${id}`, JSON.stringify([...next])); } catch { /* storage unavailable */ }
      return next;
    });

  // ---- Submit -------------------------------------------------------------
  const submit = useCallback(async (reason: 'manual' | 'left_test' | 'time_up') => {
    if (finished.current) return;
    finished.current = true;
    setSubmitting(true);
    setDialog(null);
    try {
      await api.post(`/api/tests/${id}/submit`, { reason });
      router.replace(`/dashboard/tests/${id}`);
    } catch (err) {
      finished.current = false;
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Could not submit the test. Please try again.');
    }
  }, [id, router]);

  // ---- Timer --------------------------------------------------------------
  const remaining = test ? new Date(test.deadline).getTime() - (now + clockOffset) : 0;
  useEffect(() => {
    if (!test) return;
    const deadline = new Date(test.deadline).getTime();
    let lastTimeUpTry = 0;
    const t = setInterval(() => {
      const nowMs = Date.now();
      setNow(nowMs);
      // Retry at most every 3s if the server says time isn't quite up yet (small clock drift).
      if (deadline - (nowMs + clockOffset) <= 0 && nowMs - lastTimeUpTry > 3000) {
        lastTimeUpTry = nowMs;
        submit('time_up');
      }
    }, 500);
    return () => clearInterval(t);
  }, [test, clockOffset, submit]);

  // ---- Proctoring ---------------------------------------------------------
  const sendProctor = useCallback((event: 'leave' | 'return' | 'check') => {
    proctorQueue.current = proctorQueue.current
      .then(() => api.post<ProctorResponse>(`/api/tests/${id}/proctor`, { event }))
      .then((r) => {
        setTabSwitches(r.tabSwitches);
        if (r.status === 'submitted') goToResult();
        else if (event === 'return') setDialog({ warning: r.tabSwitches });
      })
      .catch(() => { /* a failed report must never break the test */ });
  }, [id, goToResult]);

  useEffect(() => {
    if (!test) return;

    const leave = () => {
      if (finished.current || away.current) return;
      const timer = setTimeout(() => sendProctor('check'), (AWAY_LIMIT_SECONDS + 1) * 1000);
      away.current = { since: Date.now(), timer };
      setAwayFor(0);
      sendProctor('leave');
    };
    const back = () => {
      if (finished.current || !away.current || document.visibilityState !== 'visible' || !document.hasFocus()) return;
      clearTimeout(away.current.timer);
      away.current = null;
      setAwayFor(null);
      sendProctor('return');
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : back());

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', leave);
    window.addEventListener('focus', back);
    const tick = setInterval(() => {
      if (away.current) setAwayFor(Math.floor((Date.now() - away.current.since) / 1000));
    }, 250);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', leave);
      window.removeEventListener('focus', back);
      clearInterval(tick);
      if (away.current) clearTimeout(away.current.timer);
    };
  }, [test, sendProctor]);

  // ---- Copy / paste / right-click / print blocking --------------------------
  useEffect(() => {
    const block = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) e.preventDefault();
      if (e.key === 'PrintScreen') e.preventDefault();
    };
    const events = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'dragstart', 'drop'] as const;
    events.forEach((ev) => document.addEventListener(ev, block));
    document.addEventListener('keydown', onKey);
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, block));
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // ---- Leaving the page: browser warning + back button -------------------------
  useEffect(() => {
    if (!test) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (finished.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    const onPopState = () => {
      if (finished.current) return;
      history.pushState(null, '', location.href);
      setDialog('exit');
    };
    history.pushState(null, '', location.href);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, [test]);

  // ---- Answering ----------------------------------------------------------
  const choose = async (questionId: string, option: number | null) => {
    if (finished.current) return;
    const previous = answers;
    setAnswers((a) => {
      const next = { ...a };
      if (option === null) delete next[questionId];
      else next[questionId] = option;
      return next;
    });
    setError('');
    try {
      await api.post(`/api/tests/${id}/answer`, { questionId, option });
    } catch (err) {
      setAnswers(previous);
      const message = err instanceof Error ? err.message : 'Your answer was not saved.';
      if (/submitted|closed|Time is up/i.test(message)) goToResult();
      else setError(`${message} Please select it again.`);
    }
  };

  const go = (i: number) => {
    const next = Math.max(0, Math.min(questions.length - 1, i));
    setIndex(next);
    if (questions[next]) markVisited(questions[next].id);
  };

  // ---- Render -------------------------------------------------------------
  if (error && !test) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f9fe] p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => router.replace('/dashboard/tests')} className="mt-4 text-sm font-semibold text-[#2473d3]">Back to tests</button>
        </div>
      </div>
    );
  }
  if (!test || !current) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f5f9fe] text-sm text-[#7790ad]">Loading your test…</div>;
  }

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  // A question counts as skipped once the student has moved away from it unanswered.
  const isSkipped = (q: { id: string }) => q.id !== current.id && visited.has(q.id) && answers[q.id] === undefined;
  const skippedCount = questions.filter(isSkipped).length;
  const unvisitedCount = questions.filter((q) => !visited.has(q.id) && answers[q.id] === undefined).length;
  const lowTime = remaining < 5 * 60_000;

  return (
    <div className="min-h-screen select-none bg-[#f5f9fe] text-ink" onCopy={(e) => e.preventDefault()}>
      <style>{'@media print { body { display: none !important; } }'}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-[#e4edf7] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{test.subject} · {LEVEL_LABELS[test.level]} test</p>
            <p className="truncate text-xs text-[#7790ad]">
              {test.topic_name ?? 'All topics'} · {questions.length} questions · 50 marks ·{' '}
              {test.negative_marking ? `negative marking ${test.negative_mark}× per wrong answer` : 'no negative marking'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span
              title="Tab or window switches"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${tabSwitches ? 'bg-amber-50 text-amber-700' : 'bg-[#f1f6fc] text-[#53739b]'}`}
            >
              <ShieldAlert size={14} /> {tabSwitches}/{MAX_TAB_SWITCHES}
            </span>
            <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${lowTime ? 'bg-red-50 text-red-600' : 'bg-[#f1f6fc] text-ink'}`}>
              <Clock size={14} /> {formatTime(remaining)}
            </span>
            <button onClick={() => setDialog('exit')} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#617b9b] hover:bg-[#f1f6fc]">
              <LogOut size={14} /> Exit
            </button>
            <button
              onClick={() => setDialog('submit')}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--color-secondary)' }}
            >
              <Send size={14} /> Submit
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_300px]">
        {/* Question */}
        <section className="rounded-2xl border border-[#e2ebf5] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#7790ad]">
            <span className="text-ink">Question {index + 1} of {questions.length}</span>
            <span>·</span><span>{LEVEL_LABELS[current.difficulty]}</span>
            <span>·</span><span>{MARKS[current.difficulty]} mark{MARKS[current.difficulty] > 1 ? 's' : ''}</span>
            <span className="ml-auto truncate">{current.topic}</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-base font-medium leading-relaxed">{current.question}</p>

          <div className="mt-5 space-y-2.5" role="radiogroup" aria-label={`Options for question ${index + 1}`}>
            {current.options.map((option, i) => {
              const selected = answers[current.id] === i;
              return (
                <button
                  key={i}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choose(current.id, i)}
                  disabled={submitting}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selected ? 'shadow-sm' : 'border-[#dce6f0] bg-white hover:border-[#a9ccec] hover:bg-[#f8fbff]'
                  }`}
                  style={selected ? { borderColor: 'var(--color-secondary)', backgroundColor: 'color-mix(in srgb, var(--color-secondary) 8%, white)' } : undefined}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${selected ? 'border-transparent text-white' : 'border-[#cbdbea] text-[#53739b]'}`}
                    style={selected ? { backgroundColor: 'var(--color-secondary)' } : undefined}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="whitespace-pre-wrap pt-0.5">{option}</span>
                </button>
              );
            })}
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button onClick={() => go(index - 1)} disabled={index === 0} className="flex items-center gap-1 rounded-xl border border-[#dce6f0] px-4 py-2 text-sm font-semibold text-[#53739b] disabled:opacity-40">
              <ChevronLeft size={16} /> Previous
            </button>
            {answers[current.id] !== undefined && (
              <button onClick={() => choose(current.id, null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#7790ad] hover:bg-[#f1f6fc]">
                Clear answer
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={() => go(index + 1)} disabled={index === questions.length - 1} className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-[#7790ad] hover:bg-[#f1f6fc] disabled:opacity-40">
                <SkipForward size={15} /> Skip
              </button>
              <button
                onClick={() => (index === questions.length - 1 ? setDialog('submit') : go(index + 1))}
                className="flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-secondary)' }}
              >
                {index === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Navigator */}
        <aside className="h-fit rounded-2xl border border-[#e2ebf5] bg-white p-4 lg:sticky lg:top-20">
          <p className="text-xs font-bold uppercase tracking-wide text-[#7790ad]">Questions</p>
          <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-6">
            {questions.map((q, i) => {
              const answered = answers[q.id] !== undefined;
              const skipped = isSkipped(q);
              return (
                <button
                  key={q.id}
                  onClick={() => go(i)}
                  aria-label={`Question ${i + 1}, ${answered ? 'answered' : skipped ? 'skipped' : 'not visited'}`}
                  aria-current={i === index ? 'step' : undefined}
                  className={`h-9 rounded-lg text-xs font-bold tabular-nums transition ${
                    answered ? 'bg-emerald-500 text-white' : skipped ? 'bg-amber-100 text-amber-800' : 'bg-[#f1f6fc] text-[#7790ad]'
                  } ${i === index ? 'ring-2 ring-offset-1' : ''}`}
                  style={i === index ? { ['--tw-ring-color' as string]: 'var(--color-secondary)' } : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-[#53739b]">
            <Legend className="bg-emerald-500" label="Answered" count={answeredCount} />
            <Legend className="bg-amber-100" label="Skipped" count={skippedCount} />
            <Legend className="bg-[#f1f6fc]" label="Not visited" count={unvisitedCount} />
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-[#9aadc2]">
            Stay on this tab. Each switch is recorded; the {MAX_TAB_SWITCHES}th switch, or being away for more than {AWAY_LIMIT_SECONDS} seconds, submits the test automatically.
          </p>
        </aside>
      </main>

      {/* Away countdown (shown while the window has lost focus) */}
      {awayFor !== null && (
        <Overlay>
          <AlertTriangle className="mx-auto text-amber-500" size={32} />
          <h2 className="mt-3 text-lg font-bold">You have left the test window</h2>
          <p className="mt-2 text-sm text-[#607a9f]">Return now. The test will be submitted automatically in</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-red-600">{Math.max(0, AWAY_LIMIT_SECONDS - awayFor)}s</p>
        </Overlay>
      )}

      {dialog && typeof dialog === 'object' && awayFor === null && (
        <Overlay>
          <ShieldAlert className="mx-auto text-amber-500" size={32} />
          <h2 className="mt-3 text-lg font-bold">Tab switch recorded</h2>
          <p className="mt-2 text-sm text-[#607a9f]">
            You left the test window. This is switch <b>{dialog.warning}</b> of {MAX_TAB_SWITCHES}. On switch {MAX_TAB_SWITCHES} your test will be submitted automatically.
          </p>
          <button onClick={() => setDialog(null)} className="mt-5 rounded-xl px-5 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-secondary)' }}>
            Back to the test
          </button>
        </Overlay>
      )}

      {dialog === 'exit' && (
        <Overlay>
          <AlertTriangle className="mx-auto text-red-500" size={32} />
          <h2 className="mt-3 text-lg font-bold">Leave the test?</h2>
          <p className="mt-2 text-sm text-[#607a9f]">
            If you leave this session, your test will be submitted now and graded based on the questions you have answered so far
            ({answeredCount} of {questions.length}). You cannot come back to it.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => setDialog(null)} className="rounded-xl px-5 py-2 text-sm font-semibold text-[#53739b] hover:bg-[#f1f6fc]">Stay in test</button>
            <button onClick={() => submit('left_test')} className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white">Leave and submit</button>
          </div>
        </Overlay>
      )}

      {dialog === 'submit' && (
        <Overlay>
          <Send className="mx-auto" size={28} style={{ color: 'var(--color-secondary)' }} />
          <h2 className="mt-3 text-lg font-bold">Submit your test?</h2>
          <p className="mt-2 text-sm text-[#607a9f]">
            Answered <b>{answeredCount}</b> of {questions.length}.
            {questions.length - answeredCount > 0 && ` ${questions.length - answeredCount} unanswered question(s) will score 0.`}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => setDialog(null)} className="rounded-xl px-5 py-2 text-sm font-semibold text-[#53739b] hover:bg-[#f1f6fc]">Keep working</button>
            <button onClick={() => submit('manual')} className="rounded-xl px-5 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--color-secondary)' }}>
              Submit test
            </button>
          </div>
        </Overlay>
      )}

      {submitting && (
        <Overlay>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: 'var(--color-secondary)', borderTopColor: 'transparent' }} />
          <p className="mt-4 text-sm font-semibold">Grading your test…</p>
        </Overlay>
      )}
    </div>
  );
}

function Legend({ className, label, count }: { className: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3.5 w-3.5 rounded ${className}`} />
      <span>{label}</span>
      <span className="ml-auto font-bold tabular-nums">{count}</span>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1b33]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">{children}</div>
    </div>
  );
}
