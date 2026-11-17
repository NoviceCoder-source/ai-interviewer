'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useSiteSettings } from '../../lib/SiteSettingsContext';
import { LEVEL_LABELS, TEST_LEVELS, mixOf, type TestConfig, type TestLevel } from '../../lib/tests/config';
import { TEMPLATE_HEADER, toCsvLine } from '../../lib/tests/csv';
import AdminPage, { AdminNotice, buttonClass, cardClass, inputClass } from '../../components/admin/AdminPage';

interface TopicRow {
  id: string;
  subject: string;
  name: string;
  counts: Record<TestLevel, number>;
}

interface QuestionRow {
  id: string;
  subject: string;
  topic: string;
  difficulty: TestLevel;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

interface UploadResult {
  inserted: number;
  createdTopics: string[];
  errors: { line: number; error: string }[];
  duplicates: { line: number; question: string }[];
  nearDuplicates: { line: number; question: string; similarTo: string; similarity: number }[];
}

const sumCounts = (rows: TopicRow[]) =>
  rows.reduce((acc, t) => {
    for (const l of TEST_LEVELS) acc[l] += t.counts[l];
    return acc;
  }, { basic: 0, intermediate: 0, advanced: 0 } as Record<TestLevel, number>);

const canRun = (counts: Record<TestLevel, number>, config: TestConfig) => {
  const mix = mixOf(config);
  return TEST_LEVELS.every((l) => counts[l] >= mix[l]);
};

function downloadTemplate() {
  const sample = [
    TEMPLATE_HEADER,
    ['Python', 'Data Types', 'basic', 'Which of these is a mutable data type in Python?', 'tuple', 'list', 'str', 'frozenset', 'B', 'Lists can be changed after creation.'],
    ['SQL', 'Joins', 'intermediate', 'Which join returns all rows from the left table?', 'INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN', 'B', ''],
  ];
  const blob = new Blob(['﻿' + sample.map(toCsvLine).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'question-bank-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function QuestionBankPage() {
  const { subjects } = useSiteSettings();
  const [subject, setSubject] = useState(subjects[0] ?? '');
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [configs, setConfigs] = useState<TestConfig[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [topicMsg, setTopicMsg] = useState<{ error?: string; success?: string }>({});

  const loadTopics = useCallback(async () => {
    try {
      const { topics } = await api.get<{ topics: TopicRow[] }>('/api/admin/topics');
      setTopics(topics);
    } catch (err) {
      setTopicMsg({ error: err instanceof Error ? err.message : 'Could not load topics.' });
    }
  }, []);

  useEffect(() => {
    api.get<{ topics: TopicRow[] }>('/api/admin/topics')
      .then((r) => setTopics(r.topics))
      .catch((err) => setTopicMsg({ error: err instanceof Error ? err.message : 'Could not load topics. Has the Phase 1 migration been run?' }));
    api.get<{ configs: TestConfig[] }>('/api/admin/test-config').then((r) => setConfigs(r.configs)).catch(() => {});
  }, []);

  const subjectTopics = useMemo(() => topics.filter((t) => t.subject === subject), [topics, subject]);
  const subjectTotals = useMemo(() => sumCounts(subjectTopics), [subjectTopics]);

  const addTopic = async () => {
    setTopicMsg({});
    try {
      await api.post('/api/admin/topics', { subject, name: newTopic });
      setNewTopic('');
      setTopicMsg({ success: 'Topic added.' });
      loadTopics();
    } catch (err) {
      setTopicMsg({ error: err instanceof Error ? err.message : 'Could not add topic.' });
    }
  };

  const deleteTopic = async (t: TopicRow) => {
    if (!window.confirm(`Delete the topic "${t.name}"?`)) return;
    setTopicMsg({});
    try {
      await fetch(`/api/admin/topics/${t.id}`, { method: 'DELETE' }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Could not delete topic.');
      });
      loadTopics();
    } catch (err) {
      setTopicMsg({ error: err instanceof Error ? err.message : 'Could not delete topic.' });
    }
  };

  return (
    <AdminPage
      wide
      title="Question Bank"
      description="Questions and answers for MCQ tests come only from this bank. Tests pick questions at random by code — no AI generation."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Topics */}
        <section className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Topics</h2>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputClass} max-w-[200px]`} aria-label="Subject">
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-2">Topic</th>
                  {TEST_LEVELS.map((l) => <th key={l} className="px-2 py-2 text-right">{LEVEL_LABELS[l]}</th>)}
                  <th className="py-2 pl-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {subjectTopics.map((t) => (
                  <tr key={t.id}>
                    <td className="py-2 pr-2 font-medium">{t.name}</td>
                    {TEST_LEVELS.map((l) => <td key={l} className="px-2 py-2 text-right tabular-nums text-gray-300">{t.counts[l]}</td>)}
                    <td className="py-2 pl-2 text-right">
                      <button onClick={() => deleteTopic(t)} className="text-xs font-bold text-red-400 hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 pr-2">All {subject} topics</td>
                  {TEST_LEVELS.map((l) => <td key={l} className="px-2 py-2 text-right tabular-nums">{subjectTotals[l]}</td>)}
                  <td />
                </tr>
              </tbody>
            </table>
            {subjectTopics.length === 0 && <p className="mt-3 text-sm text-gray-500">No topics yet. Add one below, or upload a CSV — missing topics are created automatically.</p>}
          </div>

          {configs.length > 0 && (
            <div className="mt-4 rounded-xl bg-black/30 p-3 text-xs text-gray-400">
              <p className="mb-2 font-bold uppercase tracking-wide text-gray-500">Tests students can take now</p>
              <ul className="space-y-1">
                <li>
                  All {subject} topics:{' '}
                  {configs.map((c) => (
                    <span key={c.level} className={`mr-2 ${canRun(subjectTotals, c) ? 'text-emerald-400' : 'text-gray-600 line-through'}`}>{LEVEL_LABELS[c.level]}</span>
                  ))}
                </li>
                {subjectTopics.map((t) => (
                  <li key={t.id}>
                    {t.name}:{' '}
                    {configs.map((c) => (
                      <span key={c.level} className={`mr-2 ${canRun(t.counts, c) ? 'text-emerald-400' : 'text-gray-600 line-through'}`}>{LEVEL_LABELS[c.level]}</span>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-gray-600">A test needs enough questions of each difficulty for its mix (see Test Settings).</p>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder={`New ${subject} topic`} className={inputClass} />
            <button onClick={addTopic} disabled={!newTopic.trim()} className={buttonClass}>Add</button>
          </div>
          <div className="mt-3"><AdminNotice {...topicMsg} /></div>
        </section>

        <UploadCard onUploaded={loadTopics} />
      </div>

      <QuestionList subjects={subjects} topics={topics} onChanged={loadTopics} />
    </AdminPage>
  );
}

function UploadCard({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);

  const upload = async (allowNearDuplicates: boolean) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('allowNearDuplicates', String(allowNearDuplicates));
      const res = await fetch('/api/admin/questions/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setResult(data);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-bold">Upload questions (CSV)</h2>
      <p className="mt-1 text-sm text-gray-400">
        One question per row: <code className="text-gray-300">subject, topic, difficulty, question, option_a … option_f, correct_answer, explanation</code>.
        Difficulty is basic, intermediate or advanced. Correct answer is the option letter (A–F). From Excel, use File → Save As → <b>CSV UTF-8</b>.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={downloadTemplate} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10">
          Download template
        </button>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(''); }}
          className="text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
        />
        <button onClick={() => upload(false)} disabled={!file || uploading} className={buttonClass}>
          {uploading ? 'Checking…' : 'Upload'}
        </button>
      </div>
      <div className="mt-3"><AdminNotice error={error} /></div>

      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <AdminNotice success={`${result.inserted} question(s) added.${result.createdTopics.length ? ` New topics: ${result.createdTopics.join(', ')}.` : ''}`} />
          {result.errors.length > 0 && (
            <ResultList title={`${result.errors.length} row(s) rejected`} tone="red">
              {result.errors.map((e) => <li key={e.line}>Line {e.line}: {e.error}</li>)}
            </ResultList>
          )}
          {result.duplicates.length > 0 && (
            <ResultList title={`${result.duplicates.length} exact duplicate(s) skipped`} tone="gray">
              {result.duplicates.map((d) => <li key={d.line}>Line {d.line}: {d.question}</li>)}
            </ResultList>
          )}
          {result.nearDuplicates.length > 0 && (
            <ResultList title={`${result.nearDuplicates.length} possible duplicate(s) held back for review`} tone="amber">
              {result.nearDuplicates.map((d) => (
                <li key={d.line}>
                  Line {d.line}: “{d.question}” is {d.similarity}% similar to “{d.similarTo}”
                </li>
              ))}
              <li className="list-none pt-2">
                <button onClick={() => upload(true)} disabled={uploading} className={buttonClass}>
                  Import these anyway
                </button>
              </li>
            </ResultList>
          )}
        </div>
      )}
    </section>
  );
}

function ResultList({ title, tone, children }: { title: string; tone: 'red' | 'amber' | 'gray'; children: React.ReactNode }) {
  const colors = { red: 'border-red-500/20 text-red-300', amber: 'border-amber-500/20 text-amber-200', gray: 'border-gray-700 text-gray-400' };
  return (
    <details open className={`rounded-xl border bg-black/20 p-3 ${colors[tone]}`}>
      <summary className="cursor-pointer font-bold">{title}</summary>
      <ul className="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-xs">{children}</ul>
    </details>
  );
}

function QuestionList({ subjects, topics, onChanged }: { subjects: string[]; topics: TopicRow[]; onChanged: () => void }) {
  const [filters, setFilters] = useState({ subject: '', topicId: '', difficulty: '', q: '' });
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ questions: QuestionRow[]; total: number; pageSize: number }>({ questions: [], total: 0, pageSize: 50 });
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  // Loading = the last finished request isn't the one for the current filters.
  const requestKey = JSON.stringify({ filters, page, reload });
  const [loadedKey, setLoadedKey] = useState('');
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    const params = new URLSearchParams({ ...filters, page: String(page) });
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get<typeof data>(`/api/admin/questions?${params}`)
        .then((d) => { if (!cancelled) { setData(d); setError(''); } })
        .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load questions.'); })
        .finally(() => { if (!cancelled) setLoadedKey(requestKey); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filters, page, reload, requestKey]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setPage(0);
    setFilters((f) => ({ ...f, [key]: value, ...(key === 'subject' ? { topicId: '' } : {}) }));
  };

  const remove = async (q: QuestionRow) => {
    if (!window.confirm('Delete this question from the bank? Past test reports keep their copy.')) return;
    const res = await fetch(`/api/admin/questions/${q.id}`, { method: 'DELETE' });
    if (!res.ok) { setError('Could not delete the question.'); return; }
    setReload((n) => n + 1);
    onChanged();
  };

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <section className={`${cardClass} mt-6`}>
      <h2 className="text-lg font-bold">Questions <span className="text-sm font-medium text-gray-500">({data.total})</span></h2>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <select value={filters.subject} onChange={(e) => setFilter('subject', e.target.value)} className={inputClass} aria-label="Filter by subject">
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.topicId} onChange={(e) => setFilter('topicId', e.target.value)} className={inputClass} aria-label="Filter by topic">
          <option value="">All topics</option>
          {topics.filter((t) => !filters.subject || t.subject === filters.subject).map((t) => (
            <option key={t.id} value={t.id}>{filters.subject ? t.name : `${t.subject} · ${t.name}`}</option>
          ))}
        </select>
        <select value={filters.difficulty} onChange={(e) => setFilter('difficulty', e.target.value)} className={inputClass} aria-label="Filter by difficulty">
          <option value="">All difficulties</option>
          {TEST_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
        </select>
        <input value={filters.q} onChange={(e) => setFilter('q', e.target.value)} placeholder="Search question text" className={inputClass} />
      </div>
      <div className="mt-3"><AdminNotice error={error} /></div>

      <div className={`mt-4 space-y-3 ${loading ? 'opacity-50' : ''}`}>
        {data.questions.map((q) => (
          <article key={q.id} className="rounded-xl border border-gray-800 bg-black/20 p-4">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <span>{q.subject}</span><span>·</span><span>{q.topic}</span><span>·</span>
              <span className="text-indigo-300">{LEVEL_LABELS[q.difficulty]}</span>
              <button onClick={() => remove(q)} className="ml-auto text-red-400 hover:text-red-300">Delete</button>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium">{q.question}</p>
            <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {q.options.map((o, i) => (
                <li key={i} className={i === q.correct_index ? 'font-bold text-emerald-400' : 'text-gray-400'}>
                  {String.fromCharCode(65 + i)}. {o}
                </li>
              ))}
            </ol>
            {q.explanation && <p className="mt-2 text-xs text-gray-500">Explanation: {q.explanation}</p>}
          </article>
        ))}
        {!loading && data.questions.length === 0 && <p className="text-sm text-gray-500">No questions match these filters.</p>}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <button onClick={() => setPage((p) => p - 1)} disabled={page === 0} className="font-bold text-indigo-300 disabled:text-gray-600">← Prev</button>
          <span className="text-gray-400">Page {page + 1} of {pages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page + 1 >= pages} className="font-bold text-indigo-300 disabled:text-gray-600">Next →</button>
        </div>
      )}
    </section>
  );
}
