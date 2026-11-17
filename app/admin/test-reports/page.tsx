'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { LEVEL_LABELS, MAX_TAB_SWITCHES, SUBMIT_REASON_LABELS } from '../../lib/tests/config';
import type { TestSummary } from '../../lib/tests/types';
import AdminPage, { AdminNotice, cardClass, inputClass } from '../../components/admin/AdminPage';

export default function AdminTestReportsPage() {
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    api.get<{ tests: TestSummary[] }>('/api/admin/tests')
      .then((d) => setTests(d.tests))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load test reports.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tests.filter((t) =>
      (!s || [t.student?.full_name, t.student?.email, t.subject, t.topic_name].some((v) => v?.toLowerCase().includes(s))) &&
      (!flaggedOnly || t.tab_switches > 0 || (t.submit_reason && t.submit_reason !== 'manual'))
    );
  }, [tests, search, flaggedOnly]);

  return (
    <AdminPage wide title="Test Reports" description="Every submitted MCQ test, with scores and anti-cheating activity.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, email, subject or topic" className={`${inputClass} max-w-md`} />
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Only tests with tab switches or auto-submit
        </label>
      </div>
      <AdminNotice error={error} />

      <div className={`${cardClass} overflow-x-auto p-0`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Switches</th>
              <th className="px-4 py-3">Ended</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <p className="font-bold">{t.student?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{t.student?.email}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{t.subject} · {LEVEL_LABELS[t.level]}</p>
                  <p className="text-xs text-gray-500">{t.topic_name ?? 'All topics'}</p>
                </td>
                <td className="px-4 py-3 text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{t.score ?? '—'}/50</td>
                <td className={`px-4 py-3 text-right tabular-nums ${t.tab_switches ? 'font-bold text-amber-400' : 'text-gray-500'}`}>
                  {t.tab_switches}/{MAX_TAB_SWITCHES}
                </td>
                <td className={`px-4 py-3 text-xs ${t.submit_reason && t.submit_reason !== 'manual' ? 'text-amber-300' : 'text-gray-500'}`}>
                  {t.submit_reason ? SUBMIT_REASON_LABELS[t.submit_reason] : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/test-reports/${t.id}`} className="text-xs font-bold text-indigo-300 hover:text-white">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <p className="p-6 text-sm text-gray-500">No tests found.</p>}
        {loading && <p className="p-6 text-sm text-gray-500">Loading…</p>}
      </div>
    </AdminPage>
  );
}
