'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useSiteSettings } from '../../../lib/SiteSettingsContext';
import { generateTestPDF } from '../../../lib/tests/pdf';
import type { FinishedTest } from '../../../lib/tests/types';
import TestReportView from '../../../components/tests/TestReportView';

export default function AdminTestReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const settings = useSiteSettings();
  const [test, setTest] = useState<FinishedTest | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ test: FinishedTest }>(`/api/admin/tests/${id}`)
      .then((d) => setTest(d.test))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the report.'));
  }, [id]);

  const download = () => {
    if (!test) return;
    generateTestPDF(test, settings.org_name)
      .save(`test-${test.student?.full_name ?? 'student'}-${test.subject}-${test.started_at.slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#f5f9fe] p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/test-reports" className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-black">
          ← All test reports
        </Link>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {!test && !error && <p className="text-sm text-gray-500">Loading…</p>}
        {test && <TestReportView test={test} onDownload={download} />}
      </div>
    </div>
  );
}
